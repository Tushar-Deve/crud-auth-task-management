const express=require("express");
const router=express.Router();

const { createTask, getTask, getTaskById, updateTask, deleteTask, getTaskHistory, getUnreadTaskHistoryCount, markTaskHistoryAsRead, uploadFile}=require("../controllers/taskController");
const authMiddleware=require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

router.post("/createtask",upload.single("file"),authMiddleware,createTask);

router.get("/gettask",authMiddleware,getTask);

router.get("/gettask/:id",authMiddleware,getTaskById);

router.get("/gettaskhistory", authMiddleware, getTaskHistory);

router.get("/taskhistory/unread-count",authMiddleware,getUnreadTaskHistoryCount);

router.patch("/taskhistory/mark-read",authMiddleware,markTaskHistoryAsRead);

router.patch("/updatetask/:id",authMiddleware, upload.single("file"),updateTask);

router.delete("/deletetask/:id",authMiddleware,deleteTask);

router.post(
    "/upload",
    authMiddleware,
    upload.single("file"), // form-data key = file
    uploadFile
);


module.exports=router;