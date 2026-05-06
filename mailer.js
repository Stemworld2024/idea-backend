const nodemailer = require('nodemailer');

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "EXISTS" : "MISSING");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify connection configuration
transporter.verify(function (error, success) {
    if (error) {
        console.error('SMTP Connection Error:', error);
    } else {
        console.log('SMTP Server is ready to take our messages');
    }
});

const sendVerificationEmail = async (email, token) => {
    // Use BACKEND_URL for the direct link to the server
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3000';
    const verificationUrl = `${backendUrl}/verify-email/${token}`;

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

    console.log(`Attempting to send verification email to: ${email}`);
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
        return info;
    } catch (error) {
        console.error('Nodemailer Error:', error);
        throw error;
    }
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

    console.log(`Attempting to send reset email to: ${email}`);
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Reset email sent successfully:', info.response);
        return info;
    } catch (error) {
        console.error('Nodemailer Error (Reset):', error);
        throw error;
    }
};

module.exports = { sendVerificationEmail, sendResetEmail };

