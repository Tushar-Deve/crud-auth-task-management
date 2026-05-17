const express=require("express");
const router=express.Router();

const { createTask, getTask, updateTask, deleteTask, uploadFile}=require("../controllers/taskController");
const authMiddleware=require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

router.post("/createtask",upload.single("file"),authMiddleware,createTask);

router.get("/gettask",authMiddleware,getTask);

router.patch("/updatetask/:id",authMiddleware,updateTask);

router.delete("/deletetask/:id",authMiddleware,deleteTask);

router.post(
    "/upload",
    authMiddleware,
    upload.single("file"), // form-data key = file
    uploadFile
);


module.exports=router;