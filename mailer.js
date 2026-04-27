const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendVerificationEmail = async (email, token) => {
    const verificationUrl = `${process.env.APP_URL}/api/verify-email/${token}`;
    
    const mailOptions = {
        from: `"Idea Dashboard" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify your email address',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #7c3aed;">Welcome to Idea Dashboard!</h2>
                <p>Thank you for signing up. Please click the button below to verify your email address and activate your account:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email Address</a>
                </div>
                <p>If you did not create an account, you can safely ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="font-size: 12px; color: #64748b;">This link will expire in 24 hours.</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

const sendResetEmail = async (email, token) => {
    const resetUrl = `${process.env.APP_URL}/auth.html?resetToken=${token}`;
    
    const mailOptions = {
        from: `"Idea Dashboard" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Request',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #7c3aed;">Password Reset Request</h2>
                <p>You requested to reset your password. Please click the button below to set a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
                </div>
                <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="font-size: 12px; color: #64748b;">This link will expire in 1 hour.</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail, sendResetEmail };

