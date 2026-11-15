const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const multer = require("multer");
const { PRIVATE_ATTACHMENT_DIR, removeUploadedFile } = require("../utils/taskAttachments");
const { isSafePdfBuffer } = require("../utils/pdfValidation");

const DEFAULT_MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_CONFIGURABLE_FILE_SIZE = 100 * 1024 * 1024;
const MAX_FILE_SIZE = resolveMaxFileSize(process.env.TASK_ATTACHMENT_MAX_BYTES);

function resolveMaxFileSize(configuredValue) {
    if (configuredValue === undefined || configuredValue === "") return DEFAULT_MAX_FILE_SIZE;
    if (!/^\d+$/.test(configuredValue)) {
        throw new Error("TASK_ATTACHMENT_MAX_BYTES must be a positive integer");
    }
    const value = Number(configuredValue);
    if (!Number.isSafeInteger(value) || value < 1 || value > MAX_CONFIGURABLE_FILE_SIZE) {
        throw new Error("TASK_ATTACHMENT_MAX_BYTES must be between 1 and 104857600");
    }
    return value;
}

function unsupportedAttachmentError() {
    const error = new Error("Unsupported attachment");
    error.code = "UNSUPPORTED_ATTACHMENT";
    return error;
}

function createUploadMiddleware({
    storageDirectory = PRIVATE_ATTACHMENT_DIR,
    maxFileSize = MAX_FILE_SIZE,
} = {}) {
    const storage = multer.diskStorage({
        destination: (req, file, callback) => {
            fs.mkdir(storageDirectory, { recursive: true })
                .then(() => callback(null, storageDirectory))
                .catch((error) => callback(error));
        },
        filename: (req, file, callback) => callback(null, `${crypto.randomUUID()}.pdf`),
    });

    return multer({
        storage,
        limits: {
            fileSize: maxFileSize,
            files: 1,
            fields: 10,
            parts: 11,
            fieldNameSize: 100,
            fieldSize: 256 * 1024,
        },
        fileFilter: (req, file, callback) => {
            const extension = path.extname(file.originalname || "").toLowerCase();
            // Browsers and native file pickers can report a PDF as
            // application/octet-stream or another vendor MIME type. The MIME
            // value is client supplied, so only use the extension as an early
            // filter and let the byte-level PDF validator make the decision.
            if (extension !== ".pdf") {
                return callback(unsupportedAttachmentError());
            }
            return callback(null, true);
        },
    });
}

async function validateUploadedPdf(req, res, next) {
    if (!req.file) return next();

    const extension = path.extname(req.file.originalname || "").toLowerCase();
    let contents;
    try {
        if (extension !== ".pdf") {
            await removeUploadedFile(req.file);
            return res.status(400).json({ success: false, message: "Please choose a valid, safe PDF file." });
        }
        contents = await fs.readFile(req.file.path);
    } catch (error) {
        await removeUploadedFile(req.file);
        console.error("ATTACHMENT VALIDATION ERROR:", error.code || error.name);
        return res.status(500).json({ success: false, message: "Attachment validation failed" });
    }

    if (!isSafePdfBuffer(contents)) {
        await removeUploadedFile(req.file);
        return res.status(400).json({ success: false, message: "Please choose a valid, safe PDF file." });
    }
    return next();
}

function handleUploadError(error, req, res, next) {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ success: false, message: "Attachment exceeds the upload size limit" });
        }
        return res.status(400).json({ success: false, message: "Upload request exceeds allowed limits" });
    }
    if (error?.code === "UNSUPPORTED_ATTACHMENT") {
        return res.status(400).json({ success: false, message: "Please choose a valid, safe PDF file." });
    }

    console.error("ATTACHMENT UPLOAD ERROR:", error?.code || error?.name || "Error");
    return res.status(500).json({ success: false, message: "Attachment upload failed" });
}

const upload = createUploadMiddleware();
upload.createUploadMiddleware = createUploadMiddleware;
upload.validateUploadedPdf = validateUploadedPdf;
upload.handleUploadError = handleUploadError;
upload.maxFileSize = MAX_FILE_SIZE;

module.exports = upload;
