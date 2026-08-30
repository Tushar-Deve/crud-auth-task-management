const express=require("express");

const {registerUser, verifyRegisterOtp, loginUser, getProfile, logout, changePassword, forgotPassword, resetPassword}=require("../controllers/authControllers");
const  auth  = require("../middleware/authMiddleware");
const { loginLimiter, forgotLimiter } = require("../middleware/authrateLimiter");


const router=express.Router();

router.post("/register",registerUser);
router.post("/verify-register-otp", verifyRegisterOtp);
router.post("/login",loginLimiter,loginUser);
router.post("/change-password",auth,changePassword);
router.post("/forgot-password",forgotLimiter,forgotPassword);
router.post("/reset-password/:token", resetPassword);

// ------------------
// Protected route 
// ------------------

// router.post("/refreshToken",refreshToken);
router.post("/logout", auth, logout);
router.get("/profile", auth, getProfile);


router.get("/dashboard", auth, (req, res) => {
    res.json({
        success: true,
        message: "Welcome to dashboard",
        user: req.user
    });
});

module.exports=router;