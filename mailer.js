const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendVerificationEmail = async (email, token) => {
    try {
        const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3000';
        const verificationUrl = `${backendUrl}/verify-email/${token}`;

        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev', // Use your verified domain in production
            to: email,
            subject: 'Verify Your Email Address',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #7c3aed;">Verify your account</h2>
                    <p>Click the button below to verify your email address and activate your account:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email Address</a>
                    </div>
                    <p>If you did not create an account, you can safely ignore this email.</p>
                </div>
            `,
        });

        if (error) {
            console.error("❌ Resend error:", error);
            throw error;
        }

        console.log("✅ Email sent successfully:", data);
        return data;
    } catch (error) {
        console.error("❌ Email error:", error);
        throw error;
    }
};

const sendResetEmail = async (email, token) => {
    try {
        const appUrl = process.env.APP_URL || 'http://127.0.0.1:5500/frontend';
        const resetUrl = `${appUrl}/auth.html?resetToken=${token}`;

        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: email,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #7c3aed;">Reset Your Password</h2>
                    <p>Click the button below to reset your password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
                    </div>
                </div>
            `,
        });

        if (error) {
            console.error("❌ Resend error (Reset):", error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error("❌ Reset email error:", error);
        throw error;
    }
};

module.exports = { sendVerificationEmail, sendResetEmail };
