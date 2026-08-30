const nodeMailer = require("nodemailer");

require("dotenv").config();

// --------------------
// Send OTP Email
// --------------------

const sendOtpEmail = async (to, otp) => {
try {
const transporter = nodeMailer.createTransport({
service: "gmail",
auth: {
user: process.env.EMAIL_USER,
pass: process.env.EMAIL_PASS,
},
});

    await transporter.verify();

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: to,
        subject: "Verify Your Email - CRUD Auth Task Management Portal",

        text: `Your OTP is ${otp}. This OTP is valid for 1 minute.`,

        html: `
<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>Verify Your Email</title> </head> <body style="margin:0; padding:0; background-color:#f1f5f9; font-family:Arial, Helvetica, sans-serif;">
<div style="width:100%; padding:24px 12px;">

    <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden;">

        <div style="padding:32px 24px; background:linear-gradient(135deg,#312e81,#4f46e5,#2563eb); text-align:center;">

            <div style="color:#ffffff; font-size:20px; font-weight:700;">
                ✓
            </div>

            <div style="color:#e0e7ff; font-size:14px; font-weight:700; margin-top:10px;">
                CRUD Auth Task Management Portal
            </div>

        </div>

        <div style="padding:36px 28px; text-align:center;">

            <h1 style="margin:0 0 16px; color:#1e1b4b;">
                Verify Your Email
            </h1>

            <p style="color:#475569; font-size:16px; line-height:1.6;">
                Use the OTP below to complete your account registration.
            </p>

            <div style="margin:28px 0;">

                <div style="display:inline-block; padding:16px 28px; border-radius:12px; background:#eef2ff; color:#3730a3; font-size:32px; font-weight:700; letter-spacing:8px;">
                    ${otp}
                </div>

            </div>

            <div style="margin-top:24px; background:#eef2ff; padding:14px 16px; text-align:left;">

                <p style="margin:0; color:#3730a3; font-size:14px; line-height:1.55;">
                    <strong>This OTP expires in 1 minute.</strong>
                    If you did not request this registration, you can safely ignore this email.
                </p>

            </div>

        </div>

        <div style="border-top:1px solid #e2e8f0; background:#f8fafc; padding:20px 24px; text-align:center;">

            <p style="margin:0; color:#64748b; font-size:12px;">
                © 2026 CRUD Auth Task Management Portal. All Rights Reserved.
            </p>

        </div>

    </div>

</div>
</body> </html> `, });

    return true;

} catch (error) {
    console.error("OTP Email Error:", error.message);
    return false;
}

};

module.exports = sendOtpEmail;