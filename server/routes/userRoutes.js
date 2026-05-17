// const express = require("express");
// const { createUser, getAllUsers, getUserbyId, updateUser, deleteUser, loginUser } = require("../controllers/userController");
// const authMiddleware = require("../middleware/authMiddleware");

// const router = express.Router();

// router.post("/login", loginUser);

// router.post("/register", createUser);

// // Apply auth middleware to all routes below this line
// router.use(authMiddleware);

// router.get("/", getAllUsers);

// router.get("/:id", getUserbyId);

// router.put("/:id", updateUser);

// router.delete("/:id", deleteUser);

// module.exports = router;