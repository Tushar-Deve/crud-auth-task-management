const bcrypt = require("bcrypt");          // use for Password Hashing

const jwt = require("jsonwebtoken");       // use for Authentication with Token

const db = require("../config/db");        // Data .env variable File use DB queries

const crypto = require("crypto");          // To generate secure Random Token with Hash

const sendEmail = require("../utils/sendEmail");   // This Utils use for transportation 
// of data through Email

const safeUser = require("../utils/safeUser");   // sensitive data remove


const sendOtpEmail = require("../utils/sendOTPEmail");
const { saveOtp, getOtp, deleteOtp, } = require("../utils/otpStore");

const ACCESS_TOKEN_TTL = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_TOKEN_TTL_DAYS = Math.min(90, Math.max(1, Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30));
const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

function hashRefreshToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function createRefreshToken() {
    const sessionId = crypto.randomUUID();
    const secret = crypto.randomBytes(32).toString("base64url");
    return { sessionId, token: `${sessionId}.${secret}` };
}

function getRefreshSessionId(token) {
    if (typeof token !== "string") return null;
    const [sessionId, secret, extra] = token.split(".");
    if (extra !== undefined || !secret || !/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
    return sessionId;
}

function accessTokenMaxAge() {
    const match = /^([1-9]\d*)(s|m|h|d)$/.exec(ACCESS_TOKEN_TTL);
    if (!match) throw new Error("JWT_EXPIRES_IN must use seconds, minutes, hours, or days (for example 15m).");
    const units = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return Number(match[1]) * units[match[2]];
}

function authCookieOptions(path, maxAge) {
    const secure = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        secure,
        sameSite: secure ? "none" : "lax",
        path,
        ...(maxAge ? { maxAge } : {}),
    };
}

function setAuthCookies(res, accessToken, refreshToken) {
    res.cookie("accessToken", accessToken, authCookieOptions("/", accessTokenMaxAge()));
    res.cookie("refreshToken", refreshToken, authCookieOptions("/authRoutes", REFRESH_TOKEN_TTL_MS));
}

function clearAuthCookies(res) {
    res.clearCookie("accessToken", authCookieOptions("/"));
    res.clearCookie("refreshToken", authCookieOptions("/authRoutes"));
}

function signAccessToken(user, sessionId) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, sid: sessionId },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL }
    );
}

function isMobileClient(req) {
    return req.get("x-client-type") === "mobile";
}

function isAllowedWebOrigin(origin) {
    if (!origin) return false;
    const configuredOrigins = (process.env.CLIENT_ORIGINS || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    const allowedOrigins = [
        "http://localhost:3000",
        "https://crud-auth-task-management.vercel.app",
        process.env.FRONTEND_URL,
        ...configuredOrigins,
    ].filter(Boolean);
    return allowedOrigins.includes(origin);
}


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

        const { sessionId, token: refreshToken } = createRefreshToken();
        const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
        await db.query(
            `INSERT INTO "UserSession"(id, "userId", "tokenHash", "expiresAt")
             VALUES($1, $2, $3, $4)`,
            [sessionId, user.id, hashRefreshToken(refreshToken), refreshExpiresAt]
        );

        const accessToken = signAccessToken(user, sessionId);
        setAuthCookies(res, accessToken, refreshToken);
        const safe = safeUser(user);

        const response = {
            success: true,
            message: "Login successful",
            accessToken,
            user: safe
        };
        if (isMobileClient(req)) response.refreshToken = refreshToken;

        return res.status(200).json(response);

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
// --------------------

exports.refreshToken = async (req, res) => {
    const mobileClient = isMobileClient(req);
    const refreshToken = mobileClient ? req.body?.refreshToken : req.cookies?.refreshToken;
    const sessionId = getRefreshSessionId(refreshToken);

    if (!mobileClient && refreshToken && !isAllowedWebOrigin(req.get("origin"))) {
        return res.status(403).json({ success: false, message: "Refresh request origin is not allowed" });
    }
    if (!sessionId) {
        clearAuthCookies(res);
        return res.status(401).json({ success: false, message: "Refresh token is missing or invalid" });
    }

    const client = await db.connect();
    let transactionOpen = false;
    try {
        await client.query("BEGIN");
        transactionOpen = true;

        const result = await client.query(
            `SELECT s."tokenHash", s."expiresAt", s."revokedAt",
                    u.id, u.email, u.role
             FROM "UserSession" s
             INNER JOIN "User" u ON u.id = s."userId"
             WHERE s.id = $1
             FOR UPDATE OF s`,
            [sessionId]
        );
        const session = result.rows[0];

        if (!session || session.revokedAt || new Date(session.expiresAt).getTime() <= Date.now()) {
            await client.query("ROLLBACK");
            transactionOpen = false;
            clearAuthCookies(res);
            return res.status(401).json({ success: false, message: "Refresh token expired or revoked" });
        }

        if (session.tokenHash.trim() !== hashRefreshToken(refreshToken)) {
            // A previously rotated token was replayed. Revoke this session.
            await client.query(
                `UPDATE "UserSession" SET "revokedAt" = NOW() WHERE id = $1`,
                [sessionId]
            );
            await client.query("COMMIT");
            transactionOpen = false;
            clearAuthCookies(res);
            return res.status(401).json({ success: false, message: "Refresh token was already used" });
        }

        const { token: nextRefreshToken } = createRefreshToken();
        const nextRefreshExpiry = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
        const accessToken = signAccessToken(session, sessionId);

        await client.query(
            `UPDATE "UserSession"
             SET "tokenHash" = $1, "expiresAt" = $2, "lastUsedAt" = NOW()
             WHERE id = $3`,
            [hashRefreshToken(nextRefreshToken), nextRefreshExpiry, sessionId]
        );
        await client.query("COMMIT");
        transactionOpen = false;

        setAuthCookies(res, accessToken, nextRefreshToken);
        const response = { success: true, accessToken };
        if (mobileClient) response.refreshToken = nextRefreshToken;
        return res.status(200).json(response);
    } catch (error) {
        if (transactionOpen) await client.query("ROLLBACK").catch(() => {});
        console.error("REFRESH TOKEN ERROR:", error.message);
        clearAuthCookies(res);
        return res.status(500).json({ success: false, message: "Could not refresh the session" });
    } finally {
        client.release();
    }
};

// --------------------
// Logout API
// --------------------

exports.logout = async (req, res) => {
    try {
        const refreshToken = isMobileClient(req) ? req.body?.refreshToken : req.cookies?.refreshToken;
        const sessionId = getRefreshSessionId(refreshToken);
        if (sessionId) {
            await db.query(
                `UPDATE "UserSession"
                 SET "revokedAt" = COALESCE("revokedAt", NOW())
                 WHERE id = $1`,
                [sessionId]
            );
        }

        clearAuthCookies(res);
        return res.status(200).json({ success: true, message: "Logout successful" });
    } catch (error) {
        console.error("LOGOUT ERROR:", error.message);
        clearAuthCookies(res);
        return res.status(500).json({ success: false, message: "Logout failed" });
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

        await db.query(
            `UPDATE "UserSession" SET "revokedAt" = COALESCE("revokedAt", NOW())
             WHERE "userId" = $1`,
            [userId]
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
               const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
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

        await db.query(
            `UPDATE "UserSession" SET "revokedAt" = COALESCE("revokedAt", NOW())
             WHERE "userId" = $1`,
            [user.id]
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
