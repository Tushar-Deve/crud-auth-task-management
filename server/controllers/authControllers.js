const bcrypt = require("bcrypt");          // use for Password Hashing

const jwt = require("jsonwebtoken");       // use for Authentication with Token

const db = require("../config/db");        // Data .env variable File use DB queries

const crypto = require("crypto");          // To generate secure Random Token with Hash

const sendEmail = require("../utils/sendEmail");   // This Utils use for transportation 
// of data through Email

const safeUser = require("../utils/safeUser");   // sensitive data remove


// ---------------
// RegisterUser
// ---------------

exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Required fields

        if (!name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (!email.includes("@")) {
            return res.status(400).json({
                success: false,
                message: "Invalid email"
            });
        }

        if (role !== "user" && role !== "admin") {
            return res.status(400).json({
                success: false,
                message: "Invalid role"
            });
        }

        // 1. check if user already exist

        const result = await db.query(
            `SELECT * FROM "User" where email=$1`,
            [email]
        );

        const userExist = result.rows;

        if (userExist.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email already exists",
            });
        }

        // 2. Hash password bcrypt

        const strongPassword = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/;

        if (!strongPassword.test(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must contain Letters and Numbers",
            });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await db.query(
            `INSERT INTO "User"(name,email,password,role)
            VALUES($1,$2,$3,$4)
            RETURNING id, name, email, role`,
            [name, email, hashedPassword, role]
        );

        const safe=safeUser(newUser.rows[0]);       // sensitive data remove case

        return res.status(201).json({
            success: true,
            message: "User Register Successfully",
            user: safe                             // Safe response return 
        })


    }

    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// ------------
// LoginUser
// ------------

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. user find 

        if (!email || !password) {
            return res.status(400).json(
                {
                    success: false,
                    message: "ERROR: All Fields are Required",
                }
            )
        }

        const { rows } = await db.query(
            ` SELECT * FROM "User" where LOWER(email)=LOWER($1)`,
            [email]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "ERROR:User not found"
            })
        }

        const user = rows[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid Credential",
            })
        }

        // JWT Token 

        const payLoad = {
            id: user.id,
            email: user.email,
            role:user.role
        };

        const accessToken = jwt.sign(
            payLoad,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        const refreshToken = jwt.sign(
            { id: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_SECRET_EXPIRES_IN }
        );

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: false, // ⚠️ production me true (https)
            sameSite: "Strict",
            maxAge: 15 * 60 * 1000 // 15 min
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: "Strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        await db.query(
            `UPDATE "User" SET refresh_token = $1 WHERE id = $2`,
            [refreshToken, user.id]
        );

        // password remo    ve (optional)
        const safe = safeUser(user);

        res.status(200).json({
            success: true,
            message: "Login successful",
            accessToken,
            user: safe
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            messgae: error.message
        });
    }
}

// --------------------
// Refresh Token API 
// ....................

exports.refreshToken = async (req, res) => {
    try {
        const token = req.cookies.refreshToken;

        // ❌ no refresh token
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No refresh token"
            });
        }

        // 🔐 verify refresh token
        const decoded = jwt.verify(
            token,
            process.env.JWT_REFRESH_SECRET
        );

        // 🔎 DB se user fetch
        const result = await db.query(
            'SELECT * FROM "User" WHERE id = $1',
            [decoded.id]
        );

        const user = result.rows[0];

        // ❌ mismatch / invalid
        if (!user || user.refresh_token !== token) {
            return res.status(403).json({
                success: false,
                message: "Invalid refresh token"
            });
        }

        // 🆕 new access token generate
        const newAccessToken = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        // 🍪 cookie update
        res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: false,
            sameSite: "Strict",
            maxAge: 15 * 60 * 1000
        });

        return res.status(200).json({
            success: true,
            message: "New access token generated"
        });

    } catch (error) {
        return res.status(403).json({
            success: false,
            message: "Refresh token expired or invalid"
        });
    }
};

// ----------------------
// Change Password API 
// ----------------------

exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        const userId = req.user.id;

        const result = await db.query(
            'SELECT * FROM "User" WHERE id = $1',
            [userId]
        );

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(oldPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({
                message: "Old password incorrect"
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await db.query(
            'UPDATE "User" SET password = $1 WHERE id = $2',
            [hashedPassword, userId]
        );

        return res.json({
            success: true,
            message: "Password updated successfully"
        });

    } catch (error) {
        return res.status(500).json({
            message: "Error updating password"
        });
    }
};


// -------------------
// Forgot password API
// -------------------


exports.forgotPassword = async (req, res) => {

    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is Required"
            });
        }

        const result = await db.query(
            `SELECT * FROM "User" WHERE LOWER(email)=LOWER($1)`,
            [email]
        );

        const user = result.rows[0];

        // ⚠️ same response (security)
        if (!user) {                                         // This code is Presenting 
            return res.status(200).json({                    // a Email Enumeration attacker
                success: true,
                message: "Reset link sent if email exists"
            });
        }

        // Token Generate for only Forgot Password
        const resetToken = crypto.randomBytes(32).toString("hex");

        // ⏱ expiry (15 min)
        const expiry = new Date(Date.now() + 15 * 60 * 1000);

        await db.query(
            `UPDATE "User"
             SET reset_token = $1,
                 reset_token_expiry = $2
             WHERE id = $3`,
            [resetToken, expiry, user.id]
        );

        // 🔗 reset link (frontend URL)
        const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

        await sendEmail(
            user.email,
            "Password Reset",
            `Click here to reset your password: ${resetLink}`
        );

        // 🧪 testing ke liye link bhej rahe hain
        return res.status(200).json({
            success: true,
            message: "Reset link sent if email exists",


        });

    }
    catch (error) {

        console.error("ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Forgot password Error"
        })
    }

}

// -----------------
// Reset Password API
// -----------------

exports.resetPassword = async (req, res) => {
    try {

        const { token } = req.params;
        const { newPassword } = req.body;

        console.log("TOKEN:", token);

        // validation
        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Token and Newpassword are required"
            })
        }

        // search user by token 
        const result = await db.query(
            `SELECT * FROM "User" where reset_token=$1`,
            [token]
        )

        const user = result.rows[0];
        console.log("USER:", user);

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired token"
            })
        }
        // ⏱ expiry check
        if (new Date() > user.reset_token_expiry) {
            return res.status(400).json({
                success: false,
                message: "Token expired"
            });
        }

        // 🔐 password hash
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // 💾 update password + delete token
        await db.query(
            `UPDATE "User"
             SET password = $1,
                 reset_token = NULL,
                 reset_token_expiry = NULL
             WHERE id = $2`,
            [hashedPassword, user.id]
        );

        return res.status(200).json({
            success: true,
            message: "Password reset successful"
        });

    }

    catch (error) {
        return res.status(500).json({
            succces: false,
            meesage: "Reset Password Error"
        });
    }
}