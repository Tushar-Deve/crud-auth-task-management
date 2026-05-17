const express=require("express");

const {registerUser,loginUser, refreshToken, changePassword, forgotPassword, resetPassword}=require("../controllers/authControllers");
const  auth  = require("../middleware/authMiddleware");
const { loginLimiter, forgotLimiter } = require("../middleware/authrateLimiter");


const router=express.Router();

router.post("/register",registerUser);
router.post("/login",loginLimiter,loginUser);
router.post("/change-password",auth,changePassword);
router.post("/forgot-password",forgotLimiter,forgotPassword);
router.post("/reset-password/:token", resetPassword);

// ------------------
// Protected route 
// ------------------

router.get("/refreshToken",refreshToken);

router.get("/dashboard", auth, (req, res) => {
    res.json({
        success: true,
        message: "Welcome to dashboard",
        user: req.user
    });
});

module.exports=router;