const bcrypt = require("bcrypt");          // use for Password Hashing

const jwt = require("jsonwebtoken");       // use for Authentication with Token

const db = require("../config/db");        // Data .env variable File use DB queries

const crypto = require("crypto");          // To generate secure Random Token with Hash

const sendEmail = require("../utils/sendEmail");   // This Utils use for transportation 
// of data through Email

const safeUser = require("../utils/safeUser");   // sensitive data remove


const sendOtpEmail = require("../utils/sendOTPEmail");
const { saveOtp, getOtp, deleteOtp, } = require("../utils/otpStore");


// --------------------
// RegisterUser
// --------------------

exports.registerUser = async (req, res) => {

    try {
        const { name, email, password } = req.body;

        // Required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Email validation
        if (!email.includes("@")) {
            return res.status(400).json({
                success: false,
                message: "Invalid email"
            });
        }

        // Check if user already exists
        const result = await db.query(
            `SELECT * FROM "User" WHERE email=$1`,
            [email]
        );

        const userExist = result.rows;

        if (userExist.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email already exists",
            });
        }

        // Password validation
        const strongPassword =
            /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/;

        if (!strongPassword.test(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must contain Letters and Numbers",
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate 6-digit OTP 

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        deleteOtp(email);

        saveOtp(email, {
            name,
            email,
            password: hashedPassword,
            otp,
        });

        const emailSent = await sendOtpEmail(email, otp);

        if (!emailSent) {
            deleteOtp(email);
            return res.status(500).json
                ({
                    success: false,
                    message: "Failed to send OTP",
                });
        }

        return res.status(200).json({
            success: true,
            message: "OTP sent to your email",
        });



        // Create user
        // Public registration always creates a normal user
        // const newUser = await db.query(
        //     `INSERT INTO "User"(name, email, password, role)
        //      VALUES($1, $2, $3, $4)
        //      RETURNING id, name, email, role`,
        //     [name, email, hashedPassword, "user"]
        // );

        // const safe = safeUser(newUser.rows[0]);

        // return res.status(201).json({
        //     success: true,
        //     message: "User Register Successfully",
        //     user: safe
        // });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



// --------------------
// Verify Register OTP
// --------------------

exports.verifyRegisterOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // 1. Required fields
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required",
            });
        }

        // 2. Get temporary registration data
        const registrationData = getOtp(email);

        if (!registrationData) {
            return res.status(400).json({
                success: false,
                message: "OTP expired or registration session not found",
            });
        }

        // 3. Check OTP expiry
        const isExpired =
            Date.now() - registrationData.createdAt > 60 * 1000;

        if (isExpired) {
            deleteOtp(email);

            return res.status(400).json({
                success: false,
                message: "OTP expired. Please register again.",
            });
        }

        // 4. Check OTP
        if (registrationData.otp !== otp.toString()) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        // 5. Create user in database
        const newUser = await db.query(
            `INSERT INTO "User"(name, email, password, role)
             VALUES($1, $2, $3, $4)
             RETURNING id, name, email, role`,
            [
                registrationData.name,
                registrationData.email,
                registrationData.password,
                "user",
            ]
        );

        // 6. Remove temporary registration data
        deleteOtp(email);

        // 7. Safe user response
        const safe = safeUser(newUser.rows[0]);

        return res.status(201).json({
            success: true,
            message: "Email verified and user registered successfully",
            user: safe,
        });

    } catch (error) {
        console.error("Verify Register OTP Error:", error);

        return res.status(500).json({
            success: false,
            message: "OTP verification failed",
        });
    }
};

// ------------
// LoginUser
// ------------

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "ERROR: All Fields are Required",
            });
        }

        // 2. Find user
        const { rows } = await db.query(
            `SELECT * FROM "User" WHERE LOWER(email)=LOWER($1)`,
            [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "ERROR: User not found"
            });
        }

        const user = rows[0];

        // 3. Check temporary account protection
        if (
            user.lockedUntil &&
            new Date(user.lockedUntil) > new Date()
        ) {
            return res.status(429).json({
                success: false,
                message: "Too many failed login attempts. Please try again after 15 minutes."
            });
        } 

        // 4. Check password
        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        // 5. Wrong password
        if (!isMatch) {

            const failedAttempts =
                (user.failedLoginAttempts || 0) + 1;

            // Lock account after 5 failed attempts
            if (failedAttempts >= 5) {

                await db.query(
                    `UPDATE "User"
                     SET "failedLoginAttempts" = $1,
                         "lockedUntil" = NOW() + INTERVAL '15 minutes'
                     WHERE id = $2`,
                    [failedAttempts, user.id]
                );

                return res.status(429).json({
                    success: false,
                    message: "Too many failed login attempts. Please try again after 15 minutes."
                });
            }

            // Update failed attempts
            await db.query(
                `UPDATE "User"
                 SET "failedLoginAttempts" = $1
                 WHERE id = $2`,
                [failedAttempts, user.id]
            );

            return res.status(401).json({
                success: false,
                message: "Invalid Credential",
            });
        }

        // 6. Correct password
        // Reset failed login protection
        await db.query(
            `UPDATE "User"
             SET "failedLoginAttempts" = 0,
                 "lockedUntil" = NULL
             WHERE id = $1`,
            [user.id]
        );

        // 7. JWT Payload
        const payLoad = {
            id: user.id,
            email: user.email,
            role: user.role
        };

        // 8. Access Token
        const accessToken = jwt.sign(
            payLoad,
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN
            }
        );

        // 9. Convert JWT expiry to milliseconds for cookie
        const expiresIn = process.env.JWT_EXPIRES_IN;

        let cookieMaxAge;

        if (expiresIn.endsWith("s")) {
            cookieMaxAge = parseInt(expiresIn) * 1000;
        } else if (expiresIn.endsWith("m")) {
            cookieMaxAge = parseInt(expiresIn) * 60 * 1000;
        } else if (expiresIn.endsWith("h")) {
            cookieMaxAge = parseInt(expiresIn) * 60 * 60 * 1000;
        } else {
            throw new Error("Invalid JWT_EXPIRES_IN format");
        }

        // 10. Store Access Token in HTTP-only cookie
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: false, // production me true (HTTPS)
            sameSite: "Strict",
            maxAge: cookieMaxAge
        });

        // 11. Safe user data
        const safe = safeUser(user);;

        // 12. Response
        return res.status(200).json({
            success: true,
            message: "Login successful",
            accessToken,
            user: safe
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ----------------------
// Get Profile API
// ----------------------

exports.getProfile = async (req, res) => {
    try {

        // Logged-in user ID from JWT middleware
        const userId = req.user.id;

        const result = await db.query(
            `SELECT id, name, email, role, "createdAt"
             FROM "User"
             WHERE id = $1`,
            [userId]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user
        });

    } catch (error) {

        console.error("Get Profile Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to get profile"
        });
    }
};


// --------------------
// Refresh Token API 
// ....................

// exports.refreshToken = async (req, res) => {
//     try {

//         console.log("========== REFRESH TOKEN API ==========");

//         const token = req.cookies.refreshToken;

//          console.log("Refresh Token:", token)

//         // ❌ no refresh token
//         if (!token) {
//             return res.status(401).json({
//                 success: false,
//                 message: "No refresh token"
//             });
//         }

//         // 🔐 verify refresh token
//         const decoded = jwt.verify(
//             token,
//             process.env.JWT_REFRESH_SECRET
//         );

//           console.log("Decoded Refresh Token:", decoded);

//         // 🔎 DB se user fetch
//         const result = await db.query(
//             'SELECT * FROM "User" WHERE id = $1',
//             [decoded.id]
//         );

//         const user = result.rows[0];

//            console.log("Refresh User:", user)

//         // ❌ mismatch / invalid
//         if (!user || user.refresh_token !== token) {
//             return res.status(403).json({
//                 success: false,
//                 message: "Invalid refresh token"
//             });
//         }

//         // 🆕 new access token generate
//         const newAccessToken = jwt.sign(
//             { id: user.id },
//             process.env.JWT_SECRET,
//             { expiresIn: "15m" }
//         );

//          console.log("✅ New Access Token Generated");

//         // 🍪 cookie update
//         res.cookie("accessToken", newAccessToken, {
//             httpOnly: true,
//             secure: false,
//             sameSite: "Strict",
//             maxAge: 15 * 60 * 1000
//         });

//         return res.status(200).json({
//             success: true,
//             message: "New access token generated",
//              accessToken: newAccessToken
//         });

//     } catch (error) {

//         console.error("❌ REFRESH ERROR:", error);

//         return res.status(403).json({
//             success: false,
//             message: "Refresh token expired or invalid"
//         });
//     }
// };

// --------------------
// Logout API   
// --------------------

exports.logout = async (req, res) => {
    try {

        // Current user id
        const userId = req.user.id;

        // Remove refresh token from database
        await db.query(
            `UPDATE "User"
             SET refresh_token = NULL
             WHERE id = $1`,
            [userId]
        );

        // Clear access token cookie
        res.clearCookie("accessToken", {
            httpOnly: true,
            secure: false,
            sameSite: "Strict",
        });

        // Clear refresh token cookie
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: false,
            sameSite: "Strict",
        });

        return res.status(200).json({
            success: true,
            message: "Logout successful",
        });

    } catch (error) {

        console.error("Logout Error:", error);

        return res.status(500).json({
            success: false,
            message: "Logout failed",
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
            success: false,
            message: "Reset Password Error"
        });
    }
}