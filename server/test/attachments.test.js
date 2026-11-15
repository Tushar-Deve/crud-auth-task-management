const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { once } = require("node:events");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "task-attachment-tests-"));
const privateDirectory = path.join(root, "private");
const secret = crypto.randomBytes(32).toString("hex");
process.env.JWT_SECRET = secret;
process.env.TASK_ATTACHMENT_STORAGE_DIR = privateDirectory;

const express = require("express");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const { createTaskAttachmentAuthorization } = require("../utils/taskAttachmentAccess");
const {
    createAttachmentDownloadHandlers,
    insertAttachmentMetadata,
    resolveAttachmentPath,
} = require("../utils/taskAttachments");
const { isSafePdfBuffer } = require("../utils/pdfValidation");
const c2paPdf = fs.readFileSync(path.join(__dirname, "fixtures/safe_test_attachment.pdf"));

function createMinimalPdf() {
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 4 0 R >>",
        "<< /Length 0 >>\nstream\n\nendstream",
    ];
    let source = "%PDF-1.4\n";
    const offsets = [0];

    objects.forEach((body, index) => {
        offsets.push(Buffer.byteLength(source, "latin1"));
        source += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });

    const xrefOffset = Buffer.byteLength(source, "latin1");
    source += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets.slice(1)) {
        source += `${String(offset).padStart(10, "0")} 00000 n \n`;
    }
    source += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return Buffer.from(source, "latin1");
}

const pdf = createMinimalPdf();
const MAX_DECODED_STREAM_BYTES = 10 * 1024 * 1024;

function pdfWithStream(dictionary, streamBytes, trailingObjects = "") {
    const prefix = Buffer.from(
        "%PDF-1.5\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< " + dictionary + " >>\nstream\n",
        "latin1"
    );
    const suffix = Buffer.from(
        "\nendstream\nendobj\n" + trailingObjects
            + "xref\n0 8\n0000000000 65535 f \ntrailer\n<< /Root 1 0 R >>\nstartxref\n0\n%%EOF\n",
        "latin1"
    );
    return Buffer.concat([prefix, streamBytes, suffix]);
}

function pdfWithMultipleStreams(streams) {
    const parts = [Buffer.from("%PDF-1.5\n1 0 obj\n<< /Type /Catalog >>\nendobj\n", "latin1")];
    for (const stream of streams) {
        parts.push(Buffer.from(
            stream.objectNumber + " 0 obj\n<< /Length " + stream.bytes.length
                + " /Filter /FlateDecode >>\nstream\n",
            "latin1"
        ));
        parts.push(stream.bytes);
        parts.push(Buffer.from("\nendstream\nendobj\n", "latin1"));
    }
    parts.push(Buffer.from("xref\ntrailer\n<< /Root 1 0 R >>\nstartxref\n0\n%%EOF\n", "latin1"));
    return Buffer.concat(parts);
}

function pdfWithIndirectLengthStreams(count, { valueCommentBytes = 0, trailingCommentBytes = 0 } = {}) {
    const parts = [Buffer.from("%PDF-1.5\n1 0 obj\n<< /Type /Catalog >>\nendobj\n", "latin1")];
    const lengthObjects = [];

    for (let index = 0; index < count; index += 1) {
        const streamObject = index + 2;
        const lengthObject = 10000 + index;
        parts.push(Buffer.from(
            streamObject + " 0 obj\n<< /Length " + lengthObject + " 0 R >>\nstream\n",
            "latin1"
        ));
        parts.push(Buffer.from("x", "latin1"));
        parts.push(Buffer.from("\nendstream\nendobj\n", "latin1"));

        const valueComment = valueCommentBytes > 0
            ? "\n%" + "p".repeat(valueCommentBytes) + "\n"
            : "\n";
        lengthObjects.push(Buffer.from(
            lengthObject + " 0 obj\n1" + valueComment + "endobj\n",
            "latin1"
        ));
    }

    parts.push(...lengthObjects);
    if (trailingCommentBytes > 0) {
        parts.push(Buffer.from("%" + "p".repeat(trailingCommentBytes) + "\n", "latin1"));
    }
    parts.push(Buffer.from("xref\ntrailer\n<< /Root 1 0 R >>\nstartxref\n0\n%%EOF\n", "latin1"));
    return Buffer.concat(parts);
}

function encodeAscii85(buffer) {
    let text = "<~";
    for (let offset = 0; offset < buffer.length; offset += 4) {
        const group = buffer.subarray(offset, offset + 4);
        let value = 0n;
        for (let index = 0; index < 4; index += 1) {
            value = (value << 8n) | BigInt(group[index] || 0);
        }
        if (group.length === 4 && value === 0n) {
            text += "z";
            continue;
        }
        const digits = Array(5);
        for (let index = 4; index >= 0; index -= 1) {
            digits[index] = String.fromCharCode(Number(value % 85n) + 33);
            value /= 85n;
        }
        text += digits.slice(0, group.length + 1).join("");
    }
    return Buffer.from(text + "~>", "latin1");
}

function token(id, role = "user") {
    return jwt.sign({ id, role }, secret, { expiresIn: "5m" });
}

async function serve(app, callback) {
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
        return await callback(`http://127.0.0.1:${server.address().port}`);
    } finally {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
}

function form({ name = "document.pdf", type = "application/pdf", bytes = pdf, extraFile = false } = {}) {
    const data = new FormData();
    data.append("file", new Blob([bytes], { type }), name);
    if (extraFile) data.append("file", new Blob([pdf], { type: "application/pdf" }), "second.pdf");
    return data;
}

function post(url, data, authToken) {
    return fetch(url, {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        body: data,
    });
}

function uploadApp(directory, maxFileSize = 1024 * 1024, taskAuthorization) {
    const app = express();
    const parser = upload.createUploadMiddleware({ storageDirectory: directory, maxFileSize });
    const handlers = [auth, ...(taskAuthorization ? [taskAuthorization] : []), parser.single("file"), upload.validateUploadedPdf,
        (req, res) => res.status(201).json({ filename: req.file.filename }), upload.handleUploadError];
    app.post("/upload", ...handlers);
    app.post("/upload/:id", ...handlers);
    return app;
}

function createTaskUploadApp(directory) {
    const app = express();
    const parser = upload.createUploadMiddleware({ storageDirectory: directory });
    const requireAdmin = (req, res, next) => req.user.role === "admin"
        ? next()
        : res.status(403).json({ success: false, message: "Only admin can create task" });
    app.post("/taskRoutes/createtask", auth, requireAdmin, parser.single("file"), upload.validateUploadedPdf,
        (req, res) => res.status(201).json({ filename: req.file.filename }), upload.handleUploadError);
    return app;
}

function downloadApp(database, options) {
    const app = express();
    const handlers = createAttachmentDownloadHandlers(database, options);
    app.get("/attachments/:id", auth, handlers.downloadById);
    app.get("/uploads/:filename", auth, handlers.downloadLegacyUrl);
    return app;
}

async function names(directory) {
    try { return await fsp.readdir(directory); }
    catch (error) { if (error.code === "ENOENT") return []; throw error; }
}

test.after(async () => fsp.rm(root, { recursive: true, force: true }));

test("create-task route order checks auth/role before Multer and rejects without writing", async () => {
    const routes = fs.readFileSync(path.join(__dirname, "../routes/taskRoutes.js"), "utf8").replace(/\s+/g, " ");
    const appSource = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
    assert.match(routes, /router\.post\( "\/createtask", authMiddleware, requireAdminToCreateTask, upload\.single\("file"\)/);
    assert.match(routes, /router\.patch\( "\/updatetask\/:id", authMiddleware, authorizeTaskAttachment, upload\.single\("file"\)/);
    assert.doesNotMatch(appSource, /express\.static\([^)]*uploads/);
    assert.match(appSource, /app\.get\("\/uploads\/:filename", authMiddleware, downloadLegacyAttachment\)/);

    const app = createTaskUploadApp(privateDirectory);
    await serve(app, async (base) => {
        const response = await post(`${base}/taskRoutes/createtask`, form());
        assert.equal(response.status, 401);
        assert.equal((await response.json()).message, "No token provided");
        const nonAdmin = await post(`${base}/taskRoutes/createtask`, form(), token(7));
        assert.equal(nonAdmin.status, 403);
    });
    assert.deepEqual(await names(privateDirectory), []);
});

test("authenticated upload accepts structurally safe PDFs with common browser MIME values and ignores client filenames", async () => {
    const directory = path.join(root, "allowed");
    await serve(uploadApp(directory), async (base) => {
        const filenames = [];
        for (const [index, type] of ["application/pdf", "application/octet-stream", "application/x-pdf", "text/html"].entries()) {
            const name = index === 0 ? "../../client-name.pdf" : `document-${index}.pdf`;
            const response = await post(`${base}/upload`, form({ name, type }), token(7));
            assert.equal(response.status, 201, `valid PDF with ${type} MIME should be accepted`);
            const { filename } = await response.json();
            assert.match(filename, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i);
            filenames.push(filename);
        }
        assert.equal(new Set(filenames).size, filenames.length);
        assert.deepEqual((await names(directory)).sort(), [...filenames].sort());
        assert.equal(fs.existsSync(path.join(root, "client-name.pdf")), false);
    });
});

test("valid PDF with a standard C2PA provenance manifest passes validation and authenticated upload", async () => {
    assert.equal(isSafePdfBuffer(c2paPdf), true, "the supplied C2PA PDF fixture must pass the byte-level validator");

    const directory = path.join(root, "c2pa-allowed");
    await serve(uploadApp(directory), async (base) => {
        const response = await post(`${base}/upload`, form({ bytes: c2paPdf }), token(7));
        assert.equal(response.status, 201, "the supplied PDF must pass the upload pipeline");
        const { filename } = await response.json();
        assert.match(filename, /^[0-9a-f-]{36}\.pdf$/i);
        assert.deepEqual(await names(directory), [filename]);
    });
});

test("ordinary embedded files remain rejected when they imitate a C2PA manifest", () => {
    const fakeC2paAttachment = Buffer.from(c2paPdf.toString("latin1")
        .replaceAll("application#2Fc2pa", "application#2Fjson")
        .replaceAll("(application/c2pa)", "(application/json)"), "latin1");
    assert.equal(isSafePdfBuffer(fakeC2paAttachment), false);
});

test("oversize, renamed, spoofed, active PDF, and multiple files are rejected with safe errors", async () => {
    const oversizedDirectory = path.join(root, "oversized");
    await serve(uploadApp(oversizedDirectory, 64), async (base) => {
        const response = await post(`${base}/upload`, form({ bytes: Buffer.concat([pdf, Buffer.alloc(200)]) }), token(7));
        assert.equal(response.status, 413);
        const body = await response.json();
        assert.equal(JSON.stringify(body).includes(oversizedDirectory), false);
    });
    assert.deepEqual(await names(oversizedDirectory), []);

    const directory = path.join(root, "rejected");
    const activePdf = Buffer.from(pdf.toString("latin1").replace("/Type /Catalog", "/Type /Catalog /OpenAction << /S /JavaScript >>"));
    const compressedAction = zlib.deflateSync(Buffer.from("/OpenAction << /S /JavaScript >>"));
    const compressedActivePdf = Buffer.from(
        `%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Filter /FlateDecode /Length ${compressedAction.length} >>\nstream\n${compressedAction.toString("latin1")}\nendstream\nendobj\n%%EOF\n`,
        "latin1"
    );
    const cases = [
        form({ name: "document.txt" }),
        form({ name: "payload.exe" }),
        form({ bytes: Buffer.from("<html><script>bad()</script></html>") }),
        form({ type: "application/pdf", bytes: Buffer.from("<html><script>bad()</script></html>") }),
        form({ bytes: Buffer.from("%PDF-1.4\nmalformed body\n%%EOF\n") }),
        form({ bytes: activePdf }),
        form({ bytes: compressedActivePdf }),
        form({ extraFile: true }),
    ];
    await serve(uploadApp(directory), async (base) => {
        for (const [index, item] of cases.entries()) {
            const response = await post(`${base}/upload`, item, token(7));
            assert.ok(response.status === 400 || response.status === 413);
            const body = await response.json();
            assert.equal(JSON.stringify(body).includes(directory), false);
            if (index < cases.length - 1) {
                assert.equal(body.message, "Please choose a valid, safe PDF file.");
            } else {
                assert.equal(body.message, "Upload request exceeds allowed limits");
            }
        }
    });
    assert.deepEqual(await names(directory), []);
    assert.equal(isSafePdfBuffer(activePdf), false);
    assert.equal(isSafePdfBuffer(compressedActivePdf), false);
});

test("indirect stream lengths reject unresolved, malformed, cyclic, duplicate, and ambiguous definitions", () => {
    const stream = Buffer.from("x", "latin1");
    assert.equal(
        isSafePdfBuffer(pdfWithStream("/Length 99 0 R", stream)),
        false,
        "unresolved indirect stream lengths must be rejected"
    );
    assert.equal(
        isSafePdfBuffer(pdfWithStream("/Length 3 0 R", stream, "3 0 obj\n[ 1 ]\nendobj\n")),
        false,
        "non-integer indirect stream lengths must be rejected"
    );
    assert.equal(
        isSafePdfBuffer(pdfWithStream(
            "/Length 3 0 R",
            stream,
            "3 0 obj\n4 0 R\nendobj\n4 0 obj\n3 0 R\nendobj\n"
        )),
        false,
        "cyclic indirect stream lengths must be rejected"
    );
    assert.equal(
        isSafePdfBuffer(pdfWithStream(
            "/Length 3 0 R",
            stream,
            "3 0 obj\n1\nendobj\n3 0 obj\n1\nendobj\n"
        )),
        false,
        "duplicate indirect length object definitions must be rejected"
    );
    assert.equal(
        isSafePdfBuffer(pdfWithStream(
            "/Length 3 0 R",
            stream,
            "% 3 0 obj\n1\nendobj\n3 0 obj\n1\nendobj\n"
        )),
        false,
        "ambiguous raw object-header candidates must be rejected"
    );

    assert.equal(isSafePdfBuffer(pdfWithStream("/Length 1", stream)), true, "valid direct stream lengths must remain accepted");
    assert.equal(
        isSafePdfBuffer(pdfWithStream("/Length 3 0 R", stream, "3 0 obj\n1\nendobj\n")),
        true,
        "valid indirect stream lengths must remain accepted"
    );
});

test("many indirect lengths use bounded indexing and enforce a deterministic parse-work budget", () => {
    const repeatedScanScenario = pdfWithIndirectLengthStreams(1024, { trailingCommentBytes: 1024 * 1024 });
    assert.equal(
        isSafePdfBuffer(repeatedScanScenario),
        true,
        "many valid indirect lengths in a large document must resolve through the reusable index"
    );

    const overBudgetIndirectValues = pdfWithIndirectLengthStreams(220, { valueCommentBytes: 40 * 1024 });
    assert.equal(
        isSafePdfBuffer(overBudgetIndirectValues),
        false,
        "aggregate bytes parsed while resolving indirect lengths must stop at the deterministic work limit"
    );
});

test("indirect, unresolved, malformed, cyclic, and ambiguous PDF filters fail closed", () => {
    const javascript = zlib.deflateSync(Buffer.from("4 0 << /S /JavaScript /JS 5 0 R >>", "latin1"));
    const objectStreamDictionary = (filter) =>
        "/Type /ObjStm /N 1 /First 4 /Filter " + filter + " /Length " + javascript.length;
    const resolvedFlateObject = "3 0 obj\n/FlateDecode\nendobj\n";

    const indirectFilterBypass = pdfWithStream(
        objectStreamDictionary("3 0 R"),
        javascript,
        resolvedFlateObject
    );
    assert.equal(isSafePdfBuffer(indirectFilterBypass), false, "compressed JavaScript with /Filter 3 0 R must be rejected");

    const unresolvedFilter = pdfWithStream(objectStreamDictionary("99 0 R"), javascript);
    assert.equal(isSafePdfBuffer(unresolvedFilter), false, "unresolved filter references must be rejected");

    const unsupportedFilter = pdfWithStream(
        "/Filter /LZWDecode /Length " + javascript.length,
        javascript
    );
    assert.equal(isSafePdfBuffer(unsupportedFilter), false, "unsupported filters must be rejected instead of skipped");

    const malformedArray = pdfWithStream(
        objectStreamDictionary("[ /FlateDecode"),
        javascript
    );
    assert.equal(isSafePdfBuffer(malformedArray), false, "malformed filter arrays must be rejected");

    const cyclicFilter = pdfWithStream(
        objectStreamDictionary("3 0 R"),
        javascript,
        "3 0 obj\n4 0 R\nendobj\n4 0 obj\n3 0 R\nendobj\n"
    );
    assert.equal(isSafePdfBuffer(cyclicFilter), false, "cyclic filter references must be rejected");

    const deepFilterChain = Array.from({ length: 20 }, (_value, index) => {
        const objectNumber = index + 3;
        const target = index === 19 ? "/FlateDecode" : (objectNumber + 1) + " 0 R";
        return objectNumber + " 0 obj\n" + target + "\nendobj\n";
    }).join("");
    const excessiveFilterChain = pdfWithStream(
        objectStreamDictionary("3 0 R"),
        javascript,
        deepFilterChain
    );
    assert.equal(isSafePdfBuffer(excessiveFilterChain), false, "filter reference chains beyond the resolution bound must be rejected");

    const ambiguousFilter = pdfWithStream(
        objectStreamDictionary("3 0 R"),
        javascript,
        "3 0 obj\n/FlateDecode\nendobj\n3 0 obj\n/ASCII85Decode\nendobj\n"
    );
    assert.equal(isSafePdfBuffer(ambiguousFilter), false, "duplicate filter object definitions must be rejected");
});

test("indirect supported filters and legitimate compressed PDFs remain accepted", () => {
    const content = Buffer.from("BT (safe text) Tj ET", "latin1");
    const compressed = zlib.deflateSync(content);
    const indirectFilterAndLength = pdfWithStream(
        "/Filter 3 0 R /Length 5 0 R",
        compressed,
        "3 0 obj\n/FlateDecode\nendobj\n5 0 obj\n" + compressed.length + "\nendobj\n"
    );
    assert.equal(isSafePdfBuffer(indirectFilterAndLength), true);

    const flate = zlib.deflateSync(content);
    const asciiHex = Buffer.from(content.toString("hex") + ">", "latin1");
    const ascii85 = encodeAscii85(content);
    const ascii85ThenFlate = encodeAscii85(flate);

    assert.equal(isSafePdfBuffer(pdfWithStream("/Filter /FlateDecode /Length " + flate.length, flate)), true);
    assert.equal(isSafePdfBuffer(pdfWithStream("/Filter /ASCIIHexDecode /Length " + asciiHex.length, asciiHex)), true);
    assert.equal(isSafePdfBuffer(pdfWithStream("/Filter /ASCII85Decode /Length " + ascii85.length, ascii85)), true);
    assert.equal(
        isSafePdfBuffer(pdfWithStream(
            "/Filter [ /ASCII85Decode /FlateDecode ] /Length " + ascii85ThenFlate.length,
            ascii85ThenFlate
        )),
        true
    );
});

test("Flate, ASCIIHex, ASCII85, and aggregate decoded-output limits are enforced", () => {
    const paddedAsciiHex = Buffer.concat([Buffer.alloc(1024 * 1024, 0x20), Buffer.from("41>", "latin1")]);
    const paddedAscii85 = Buffer.concat([Buffer.alloc(1024 * 1024, 0x20), Buffer.from("z~>", "latin1")]);
    assert.equal(
        isSafePdfBuffer(pdfWithStream(
            "/Filter /ASCIIHexDecode /Length " + paddedAsciiHex.length,
            paddedAsciiHex
        )),
        true,
        "large ASCIIHex whitespace padding must decode safely"
    );
    assert.equal(
        isSafePdfBuffer(pdfWithStream(
            "/Filter /ASCII85Decode /Length " + paddedAscii85.length,
            paddedAscii85
        )),
        true,
        "large ASCII85 whitespace padding must decode safely"
    );

    const oversizedFlate = zlib.deflateSync(Buffer.alloc(MAX_DECODED_STREAM_BYTES + 1, 0x41));
    assert.equal(
        isSafePdfBuffer(pdfWithStream(
            "/Filter /FlateDecode /Length " + oversizedFlate.length,
            oversizedFlate
        )),
        false,
        "Flate output above the per-stream limit must be rejected"
    );

    const oversizedAsciiHex = Buffer.concat([
        Buffer.alloc((MAX_DECODED_STREAM_BYTES + 1) * 2, 0x30),
        Buffer.from(">", "latin1"),
    ]);
    assert.equal(
        isSafePdfBuffer(pdfWithStream(
            "/Filter /ASCIIHexDecode /Length " + oversizedAsciiHex.length,
            oversizedAsciiHex
        )),
        false,
        "ASCIIHex output above the per-stream limit must be rejected"
    );

    const oversizedAscii85 = Buffer.from("z".repeat(Math.ceil((MAX_DECODED_STREAM_BYTES + 1) / 4)), "latin1");
    assert.equal(
        isSafePdfBuffer(pdfWithStream(
            "/Filter /ASCII85Decode /Length " + oversizedAscii85.length,
            oversizedAscii85
        )),
        false,
        "ASCII85 output above the per-stream limit must be rejected"
    );

    const repeatedContent = Buffer.alloc(9 * 1024 * 1024, 0x41);
    const repeatedCompressed = zlib.deflateSync(repeatedContent);
    const aggregateOverflow = pdfWithMultipleStreams([2, 3, 4, 5, 6].map((objectNumber) => ({
        objectNumber,
        bytes: repeatedCompressed,
    })));
    assert.equal(isSafePdfBuffer(aggregateOverflow), false, "aggregate decoded output above the total limit must be rejected");
});

test("task-level authorization runs before Multer and permits assigned users/admins", async () => {
    const directory = path.join(root, "task-access");
    const database = { query: async (_sql, params) => ({ rows: params.length === 1 || String(params[1]) === "7" ? [{ id: 10 }] : [] }) };
    const taskAuthorization = createTaskAttachmentAuthorization(database);
    const app = uploadApp(directory, 1024 * 1024, taskAuthorization);
    await serve(app, async (base) => {
        const denied = await post(`${base}/upload/10`, form(), token(8));
        assert.equal(denied.status, 404);
        assert.deepEqual(await names(directory), []);
        assert.equal((await post(`${base}/upload/10`, form(), token(7))).status, 201);
        const adminDirectory = path.join(root, "admin-task-access");
        await serve(uploadApp(adminDirectory, 1024 * 1024, taskAuthorization), async (adminBase) => {
            assert.equal((await post(`${adminBase}/upload/10`, form(), token(99, "admin"))).status, 201);
        });
    });
});

test("download access is task-scoped and responses are forced to safe PDF attachments", async () => {
    const directory = path.join(root, "download");
    await fsp.mkdir(directory, { recursive: true });
    const filename = `${crypto.randomUUID()}.pdf`;
    await fsp.writeFile(path.join(directory, filename), pdf);
    const row = { id: 42, taskId: 10, fileUrl: `private:${filename}`, uploadedBy: 3, assignedTo: 7 };
    const app = downloadApp({ query: async () => ({ rows: [row] }) }, { privateDirectory: directory, legacyDirectory: root });
    await serve(app, async (base) => {
        const denied = await fetch(`${base}/attachments/42`, { headers: { Authorization: `Bearer ${token(8)}` } });
        assert.equal(denied.status, 404);
        for (const userToken of [token(7), token(99, "admin")]) {
            const response = await fetch(`${base}/attachments/42`, { headers: { Authorization: `Bearer ${userToken}` } });
            assert.equal(response.status, 200);
            assert.equal(response.headers.get("content-type"), "application/pdf");
            assert.equal(response.headers.get("content-disposition"), 'attachment; filename="task-attachment.pdf"');
            assert.equal(response.headers.get("x-content-type-options"), "nosniff");
            assert.equal(response.headers.get("cache-control"), "private, no-store");
            assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
        }
    });
});

test("standalone attachments are uploader/admin only; missing IDs/files return safe 404s", async () => {
    const row = { id: 51, taskId: null, fileUrl: "private:00000000-0000-4000-8000-000000000000.pdf", uploadedBy: 7, assignedTo: null };
    const app = downloadApp({ query: async (_sql, params) => ({ rows: String(params[0]) === "51" ? [row] : [] }) }, { privateDirectory: path.join(root, "missing"), legacyDirectory: root });
    await serve(app, async (base) => {
        assert.equal((await fetch(`${base}/attachments/51`, { headers: { Authorization: `Bearer ${token(7)}` } })).status, 404);
        assert.equal((await fetch(`${base}/attachments/51`, { headers: { Authorization: `Bearer ${token(8)}` } })).status, 404);
        assert.equal((await fetch(`${base}/attachments/not-id`, { headers: { Authorization: `Bearer ${token(7)}` } })).status, 404);
        const response = await fetch(`${base}/attachments/51`, { headers: { Authorization: `Bearer ${token(99, "admin")}` } });
        assert.equal(response.status, 404);
        const body = await response.json();
        assert.equal(body.message, "Attachment not found");
        assert.equal(JSON.stringify(body).includes(root), false);
        assert.equal(JSON.stringify(body).includes("stack"), false);
    });
});

test("legacy download URL remains authenticated and limited to timestamp PDF names", async () => {
    const directory = path.join(root, "legacy");
    await fsp.mkdir(directory, { recursive: true });
    const filename = "1234567890123.pdf";
    await fsp.writeFile(path.join(directory, filename), pdf);
    const row = { id: 70, taskId: 10, fileUrl: `https://old-host.invalid/uploads/${filename}`, uploadedBy: 3, assignedTo: 7 };
    const app = downloadApp({ query: async () => ({ rows: [row] }) }, { privateDirectory: privateDirectory, legacyDirectory: directory });
    await serve(app, async (base) => {
        assert.equal((await fetch(`${base}/uploads/${filename}`, { headers: { Authorization: `Bearer ${token(8)}` } })).status, 404);
        assert.equal((await fetch(`${base}/uploads/${filename}`, { headers: { Authorization: `Bearer ${token(7)}` } })).status, 200);
        assert.equal(resolveAttachmentPath("https://host/uploads/123.html", { legacyDirectory: directory }), null);
        assert.equal(resolveAttachmentPath("../../outside.pdf", { legacyDirectory: directory }), null);
    });
});

test("metadata insertion failure removes the newly created file", async () => {
    const filePath = path.join(root, "failed-metadata.pdf");
    await fsp.writeFile(filePath, pdf);
    const file = { filename: `${crypto.randomUUID()}.pdf`, path: filePath };
    await assert.rejects(insertAttachmentMetadata({ query: async () => { throw new Error("test database failure"); } }, { taskId: 10, uploadedBy: 7, file }));
    await assert.rejects(fsp.stat(filePath), { code: "ENOENT" });
});
