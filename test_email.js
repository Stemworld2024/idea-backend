require('dotenv').config();
const { sendVerificationEmail } = require('./mailer');

async function testEmail() {
    console.log('--- Email Connection Test ---');
    console.log('Service:', process.env.EMAIL_SERVICE);
    console.log('User:', process.env.EMAIL_USER);
    
    try {
        console.log('Attempting to send a test email to:', process.env.EMAIL_USER);
        await sendVerificationEmail(process.env.EMAIL_USER, 'test-token-123');
        console.log('✅ Email Sent Successfully!');
    } catch (error) {
        console.error('❌ Email Failed!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        
        if (error.message.includes('Invalid login') || error.message.includes('Authentication failed')) {
            console.log('\n💡 SUGGESTION: This error usually means your password is incorrect or you need an App Password.');
            console.log('Go to: https://myaccount.google.com/apppasswords');
        }
    }
    console.log('-----------------------------');
}

testEmail();
