const { Resend } = require("resend");
require("dotenv").config();
const resend = new Resend(process.env.RESEND_API_KEY);
const sendEmail = async (to, subject, text) => {
    try {
        const resetUrl = text.match(/https?:\/\/[^\s]+/)?.[0];
        const safeResetUrl = resetUrl
            ? resetUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
            : "#";
        const { data, error } = await resend.emails.send({
            from: "onboarding@resend.dev",
            to: [to],
            subject,
            text,
            html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif; color: #1e293b;">
    <div style="width: 100%; padding: 24px 12px; box-sizing: border-box;">
        <div style="max-width: 600px; margin: 0 auto; overflow: hidden; border-radius: 16px; background-color: #ffffff; box-shadow: 0 10px 30px rgba(30, 41, 59, 0.14);">
            <div style="padding: 32px 24px; background: linear-gradient(135deg, #312e81 0%, #4f46e5 55%, #2563eb 100%); text-align: center;">
                <div style="display: inline-block; margin-bottom: 14px; border-radius: 12px; background-color: rgba(255, 255, 255, 0.16); padding: 10px 14px; color: #ffffff; font-size: 20px; font-weight: 700; line-height: 1;">
                    ✓
                </div>
                <div style="color: #e0e7ff; font-size: 14px; font-weight: 700; letter-spacing: 0.4px;">
                    CRUD Auth Task Management Portal
                </div>
            </div>
            <div style="padding: 36px 28px;">
                <h1 style="margin: 0 0 16px; color: #1e1b4b; font-size: 28px; line-height: 1.25;">
                    Reset Your Password
                </h1>
                <p style="margin: 0 0 18px; color: #475569; font-size: 16px; line-height: 1.6;">
                    We received a request to reset the password for your account.
                    Use the button below to choose a new password.
                </p>
                <div style="margin: 28px 0; text-align: center;">
                    <a href="${safeResetUrl}"
                       style="display: inline-block; border-radius: 10px; background-color: #4f46e5; padding: 14px 24px; color: #ffffff; font-size: 16px; font-weight: 700; line-height: 1; text-decoration: none;">
                        Reset Password
                    </a>
                </div>
                <div style="margin-top: 24px; border-left: 4px solid #818cf8; border-radius: 6px; background-color: #eef2ff; padding: 14px 16px;">
                    <p style="margin: 0; color: #3730a3; font-size: 14px; line-height: 1.55;">
                        <strong>This link expires in 15 minutes.</strong>
                        If you did not request a password reset,
                        you can safely ignore this email.
                    </p>
                </div>
                <p style="margin: 24px 0 0; color: #64748b; font-size: 13px; line-height: 1.55;">
                    If the button does not work, copy and paste this link into your browser:
                    <br />
                    <a href="${safeResetUrl}"
                       style="color: #4f46e5; word-break: break-all;">
                        ${safeResetUrl}
                    </a>
                </p>
            </div>
            <div style="border-top: 1px solid #e2e8f0; background-color: #f8fafc; padding: 20px 24px; text-align: center;">
                <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                    © 2026 CRUD Auth Task Management Portal. All Rights Reserved.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
`
        });
        if (error) {
            console.error("Resend Email Error:", error);
            return false;
        }
        console.log("Password reset email sent:", data?.id);
        return true;
    } catch (error) {
        console.error("Email Error:", error.message);
        return false;
    }
};
module.exports = sendEmail;
