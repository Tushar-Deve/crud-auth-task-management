const fsp = require("node:fs/promises");
const path = require("node:path");
const { isSafePdfBuffer } = require("./pdfValidation");

const LEGACY_UPLOAD_DIR = path.resolve(__dirname, "..", "uploads");
const PRIVATE_ATTACHMENT_DIR = path.resolve(
    process.env.TASK_ATTACHMENT_STORAGE_DIR || path.join(__dirname, "..", "private-uploads")
);
const relativeToLegacyDirectory = path.relative(LEGACY_UPLOAD_DIR, PRIVATE_ATTACHMENT_DIR);
const privateDirectoryIsInsideLegacy = relativeToLegacyDirectory === ""
    || (!path.isAbsolute(relativeToLegacyDirectory)
        && relativeToLegacyDirectory !== ".."
        && !relativeToLegacyDirectory.startsWith(`..${path.sep}`));
if (privateDirectoryIsInsideLegacy) {
    throw new Error("TASK_ATTACHMENT_STORAGE_DIR must be outside the legacy uploads directory");
}

async function removeUploadedFile(file) {
    if (!file?.path) return;
    try {
        await fsp.unlink(file.path);
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.error("ATTACHMENT CLEANUP ERROR:", error.code || error.name);
        }
    }
}

async function insertAttachmentMetadata(db, { taskId = null, uploadedBy, file }) {
    if (!file?.filename) throw new Error("A stored upload is required");

    try {
        const result = await db.query(
            `INSERT INTO "TaskAttachments"(taskid, fileurl, uploadedby)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [taskId, `private:${file.filename}`, uploadedBy]
        );
        if (!result.rows?.[0]) throw new Error("Attachment metadata was not created");
        return result.rows[0];
    } catch (error) {
        await removeUploadedFile(file);
        throw error;
    }
}

function canReadAttachment(user, attachment) {
    if (!user || !attachment) return false;
    if (user.role === "admin") return true;

    if (attachment.taskId === null || attachment.taskId === undefined) {
        return String(attachment.uploadedBy) === String(user.id);
    }
    return String(attachment.assignedTo) === String(user.id);
}

function resolveAttachmentPath(fileUrl, {
    privateDirectory = PRIVATE_ATTACHMENT_DIR,
    legacyDirectory = LEGACY_UPLOAD_DIR,
} = {}) {
    if (typeof fileUrl !== "string") return null;

    if (fileUrl.startsWith("private:")) {
        const filename = fileUrl.slice("private:".length);
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i.test(filename)) return null;
        return path.join(privateDirectory, filename);
    }

    let pathname;
    try {
        pathname = new URL(fileUrl, "http://legacy-attachment.local").pathname;
    } catch {
        return null;
    }

    const legacyMatch = pathname.match(/^\/uploads\/(\d+(?:\.pdf)?)$/i);
    if (!legacyMatch) return null;
    return path.join(legacyDirectory, legacyMatch[1]);
}

function createAttachmentDownloadHandlers(db, options = {}) {
    const sendRecord = async (req, res, attachment) => {
        if (!canReadAttachment(req.user, attachment)) {
            return res.status(404).json({ success: false, message: "Attachment not found" });
        }

        const filePath = resolveAttachmentPath(attachment.fileUrl, options);
        if (!filePath) {
            return res.status(404).json({ success: false, message: "Attachment not found" });
        }

        let fileStat;
        let fileContents;
        try {
            fileStat = await fsp.lstat(filePath);
            if (!fileStat.isFile() || fileStat.isSymbolicLink() || fileStat.size > 100 * 1024 * 1024) {
                return res.status(404).json({ success: false, message: "Attachment not found" });
            }
            fileContents = await fsp.readFile(filePath);
        } catch (error) {
            if (error.code !== "ENOENT") {
                console.error("ATTACHMENT READ ERROR:", error.code || error.name);
            }
            return res.status(404).json({ success: false, message: "Attachment not found" });
        }

        if (!isSafePdfBuffer(fileContents)) {
            return res.status(404).json({ success: false, message: "Attachment not found" });
        }

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="task-attachment.pdf"',
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
            "Content-Length": String(fileStat.size),
        });
        return res.status(200).send(fileContents);
    };

    const downloadById = async (req, res) => {
        if (!/^\d+$/.test(String(req.params.id || ""))) {
            return res.status(404).json({ success: false, message: "Attachment not found" });
        }

        try {
            const result = await db.query(
                `SELECT ta.id,
                        ta.taskid AS "taskId",
                        ta.fileurl AS "fileUrl",
                        ta.uploadedby AS "uploadedBy",
                        t.assigned_to AS "assignedTo"
                 FROM "TaskAttachments" ta
                 LEFT JOIN "Task" t ON t.id = ta.taskid
                 WHERE ta.id = $1`,
                [req.params.id]
            );
            const attachment = result.rows[0];
            if (!attachment || !canReadAttachment(req.user, attachment)) {
                return res.status(404).json({ success: false, message: "Attachment not found" });
            }
            return await sendRecord(req, res, attachment);
        } catch (error) {
            console.error("ATTACHMENT DOWNLOAD ERROR:", error.code || error.name);
            return res.status(500).json({ success: false, message: "Unable to download attachment" });
        }
    };

    const downloadLegacyUrl = async (req, res) => {
        const filename = String(req.params.filename || "");
        if (!/^\d+(?:\.pdf)?$/i.test(filename)) {
            return res.status(404).json({ success: false, message: "Attachment not found" });
        }

        const suffix = `/uploads/${filename}`;
        try {
            const result = await db.query(
                `SELECT ta.id,
                        ta.taskid AS "taskId",
                        ta.fileurl AS "fileUrl",
                        ta.uploadedby AS "uploadedBy",
                        t.assigned_to AS "assignedTo"
                 FROM "TaskAttachments" ta
                 LEFT JOIN "Task" t ON t.id = ta.taskid
                 WHERE RIGHT(ta.fileurl, LENGTH($1)) = $1`,
                [suffix]
            );
            const attachment = result.rows.find((row) => canReadAttachment(req.user, row));
            if (!attachment) {
                return res.status(404).json({ success: false, message: "Attachment not found" });
            }
            return await sendRecord(req, res, attachment);
        } catch (error) {
            console.error("LEGACY ATTACHMENT DOWNLOAD ERROR:", error.code || error.name);
            return res.status(500).json({ success: false, message: "Unable to download attachment" });
        }
    };

    return { downloadById, downloadLegacyUrl };
}

module.exports = {
    PRIVATE_ATTACHMENT_DIR,
    LEGACY_UPLOAD_DIR,
    canReadAttachment,
    createAttachmentDownloadHandlers,
    insertAttachmentMetadata,
    removeUploadedFile,
    resolveAttachmentPath,
};
