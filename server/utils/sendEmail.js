const nodeMailer = require("nodemailer");
require("dotenv").config();

const sendEmail = async (to, subject, text) => {
    try {

        console.log("EMAIL_USER:", process.env.EMAIL_USER);
        console.log("EMAIL_PASS:", process.env.EMAIL_PASS);

        const transporter = nodeMailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            }
        });

        console.log("Sending mail to:", to);

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            text: text,
        });

        console.log("Email sent successfully");

    } catch (error) {
        console.error("Email Error:", error);
    }
};

module.exports = sendEmail;   // ✅ IMPORTANT