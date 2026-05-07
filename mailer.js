const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendVerificationEmail = async (email, token) => {
    try {
        // We use BACKEND_URL so the link hits the server directly to verify
        const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3000';
        const verifyLink = `${backendUrl}/verify/${token}`;

        await resend.emails.send({
            from: 'StemWorld <onboarding@resend.dev>',
            to: email,
            subject: 'Verify Your Email',
            html: `
                <h2>Welcome to StemWorld</h2>
                <p>Click below to verify your account:</p>
                <a href="${verifyLink}" style="background-color: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email</a>
            `,
        });

        console.log("✅ Email sent");
    } catch (error) {
        console.error("❌ Email error:", error);
        throw error; // Rethrow so server.js can handle it
    }
};

const sendResetEmail = async (email, token) => {
    try {
        const appUrl = process.env.APP_URL || 'http://127.0.0.1:5500/frontend';
        const resetUrl = `${appUrl}/auth.html?resetToken=${token}`;

        await resend.emails.send({
            from: 'StemWorld <onboarding@resend.dev>',
            to: email,
            subject: 'Password Reset Request',
            html: `
                <h2>Reset Your Password</h2>
                <p>Click the button below to reset your password:</p>
                <a href="${resetUrl}" style="background-color: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
            `,
        });
    } catch (error) {
        console.error("❌ Reset email error:", error);
        throw error;
    }
};

module.exports = { sendVerificationEmail, sendResetEmail };
