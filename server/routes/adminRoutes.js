const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const { createUser, getAllUsers, getUser, updateUser, deleteUser,getReassignUsers, getDashboard, transferAndDeleteUser } = require("../controllers/adminController");

// --------------------
// User Management
// --------------------

router.post("/createUser", auth, admin, createUser);
router.get("/getAllUsers", auth, admin, getAllUsers);
router.get("/getUser/:id", auth, admin, getUser);
router.put("/updateUser/:id", auth, admin, updateUser);
router.delete("/deleteUser/:id", auth, admin, deleteUser);
router.get("/reassignUsers/:id",auth,admin, getReassignUsers);
router.get("/dashboard", auth, admin, getDashboard);
router.post("/transferAndDelete/:id",auth,admin,transferAndDeleteUser);

module.exports = router;