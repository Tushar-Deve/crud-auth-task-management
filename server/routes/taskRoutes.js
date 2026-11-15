const express=require("express");
const router=express.Router();

const { createTask, getTask, getTaskById, updateTask, deleteTask, getTaskHistory, getUnreadTaskHistoryCount, markTaskHistoryAsRead, getUnreadAssignmentNotifications, markAssignmentNotificationsRead, uploadFile, downloadAttachment } = require("../controllers/taskController");
const authMiddleware=require("../middleware/authMiddleware");
const authorizeTaskAttachment = require("../middleware/taskAttachmentAuthorization");
const upload = require("../middleware/upload");

function requireAdminToCreateTask(req, res, next) {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ success: false, message: "Only admin can create task" });
    }
    return next();
}

router.post(
    "/createtask",
    authMiddleware,
    requireAdminToCreateTask,
    upload.single("file"),
    upload.validateUploadedPdf,
    createTask,
    upload.handleUploadError
);

router.get("/gettask",authMiddleware,getTask);

router.get("/gettask/:id",authMiddleware,getTaskById);

router.get("/gettaskhistory", authMiddleware, getTaskHistory);

router.get("/taskhistory/unread-count",authMiddleware,getUnreadTaskHistoryCount);

router.patch("/taskhistory/mark-read",authMiddleware,markTaskHistoryAsRead);

router.get("/taskhistory/assignments/unread",authMiddleware,getUnreadAssignmentNotifications);

router.patch("/taskhistory/assignments/mark-read",authMiddleware,markAssignmentNotificationsRead);

router.patch(
    "/updatetask/:id",
    authMiddleware,
    authorizeTaskAttachment,
    upload.single("file"),
    upload.validateUploadedPdf,
    updateTask,
    upload.handleUploadError
);

router.delete("/deletetask/:id",authMiddleware,deleteTask);

router.post(
    "/upload",
    authMiddleware,
    upload.single("file"),
    upload.validateUploadedPdf,
    uploadFile,
    upload.handleUploadError
);

router.get("/attachments/:id", authMiddleware, downloadAttachment);

module.exports=router;
