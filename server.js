require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const crypto = require('crypto');
const { sendVerificationEmail, sendResetEmail } = require('./mailer');




const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: "*"
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Request Logger
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
    });
    next();
});


// Root Route for health check
app.get("/", (req, res) => {
    res.send("Backend is working ✅");
});

// ============================================================
// PROXY VIEW ENDPOINT - Fetches file from Cloudinary and serves
// it with correct headers so the browser DISPLAYS it inline.
// Uses built-in https module (no external dependencies).
// ============================================================
app.get("/api/proxy-view", (req, res) => {
    const fileUrl = req.query.url;
    const fileName = req.query.name || 'document';

    if (!fileUrl) {
        return res.status(400).send("Missing 'url' query parameter");
    }

    // Determine MIME type from filename extension
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.txt': 'text/plain',
        '.csv': 'text/csv',
        '.rtf': 'application/rtf',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Use built-in https module to fetch from Cloudinary
    const https = require('https');
    https.get(fileUrl, (proxyRes) => {
        // Follow redirects
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
            https.get(proxyRes.headers.location, (redirectRes) => {
                res.setHeader('Content-Type', contentType);
                res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
                res.setHeader('Cache-Control', 'public, max-age=3600');
                redirectRes.pipe(res);
            }).on('error', (err) => {
                console.error("Proxy redirect error:", err);
                res.status(500).send("Error loading file");
            });
            return;
        }

        if (proxyRes.statusCode !== 200) {
            return res.status(proxyRes.statusCode).send("Failed to fetch file from storage");
        }

        // Set headers to force INLINE viewing (not download)
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        res.setHeader('Cache-Control', 'public, max-age=3600');

        // Pipe the file data directly to the browser
        proxyRes.pipe(res);
    }).on('error', (err) => {
        console.error("Proxy view error:", err);
        res.status(500).send("Error loading file for viewing");
    });
});


// MongoDB Connection with caching and listeners for stability
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) {
        console.log("Using existing MongoDB connection");
        return;
    }

    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in .env file");
        }
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log("MongoDB Connected Successfully");
    } catch (err) {
        console.error("MongoDB Connection Error Details:", err.message);
    }
};

// Listen for connection events to debug disconnections
mongoose.connection.on('connected', () => console.log('Mongoose: Connected to MongoDB Atlas'));
mongoose.connection.on('error', (err) => console.error('Mongoose: Connection error:', err.message));
mongoose.connection.on('disconnected', () => {
    console.warn('Mongoose: Connection lost. Attempting to reconnect...');
});

// Initial connection call
connectDB();

// Schemas
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    username: String,
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date
});



const ideaSchema = new mongoose.Schema({
    tab: { type: String, required: true }, // openterra, stemworld, others
    idea: String,
    description: String,
    fileName: String,
    fileData: String,
    owner: String,
    status: String,
    comment: String,
    category: String,
    createdAt: { type: Date, default: Date.now }
});


const User = mongoose.models.User || mongoose.model('User', userSchema);
const Idea = mongoose.models.Idea || mongoose.model('Idea', ideaSchema);

// File Upload Config
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Use memory storage to avoid writing temporary files to disk
// This prevents Live Server from refreshing the page when a file is uploaded
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// API Endpoints

// Get all data
app.get('/data', async (req, res) => {
    console.log("Fetching all data from MongoDB...");
    try {
        // Ensure connection is ready or wait for it
        if (mongoose.connection.readyState !== 1) {
            console.log("MongoDB not ready, attempting to connect...");
            await connectDB();
        }

        const ideas = await Idea.find().lean();
        console.log(`Successfully fetched ${ideas.length} ideas.`);

        // Transform array into the tabbed object structure the frontend expects
        const structuredData = {
            openterra: ideas.filter(i => i.tab === 'openterra'),
            stemworld: ideas.filter(i => i.tab === 'stemworld'),
            others: ideas.filter(i => i.tab === 'others')
        };
        res.json(structuredData);
    } catch (err) {
        console.error("CRITICAL ERROR in /data:", err);
        res.status(500).json({
            error: 'Failed to fetch data',
            details: err.message,
            readyState: mongoose.connection.readyState
        });
    }
});


// Create a new idea
app.post('/ideas', async (req, res) => {
    try {
        console.log('--- [POST] /ideas ---');
        console.log('Data:', req.body);
        const newIdea = new Idea(req.body);
        await newIdea.save();
        res.status(201).json(newIdea);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create idea' });
    }
});

// Update an existing idea
app.patch('/ideas/:id', async (req, res) => {
    try {
        console.log(`--- [PATCH] /ideas/${req.params.id} ---`);
        console.log('Update:', req.body);
        const updatedIdea = await Idea.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { returnDocument: 'after' }
        );
        if (!updatedIdea) return res.status(404).json({ error: 'Idea not found' });
        res.json(updatedIdea);
    } catch (err) {
        console.error('Patch Error:', err);
        res.status(500).json({ error: 'Failed to update idea' });
    }
});

// Delete an idea
app.delete('/ideas/:id', async (req, res) => {
    try {
        console.log(`--- [DELETE] /ideas/${req.params.id} ---`);
        const deletedIdea = await Idea.findByIdAndDelete(req.params.id);

        if (!deletedIdea) return res.status(404).json({ error: 'Idea not found' });



        res.json({ success: true, message: 'Idea deleted successfully' });
    } catch (err) {
        console.error('Delete Error:', err);
        res.status(500).json({ error: 'Failed to delete idea' });
    }
});




// Download file (Forces download)
app.get('/download/:filename', (req, res) => {
    const filePath = path.join(UPLOADS_DIR, req.params.filename);
    if (fs.existsSync(filePath)) res.download(filePath);
    else res.status(404).json({ error: 'File not found' });
});

// View file (Allows browser to render if supported)
app.get('/view/:filename', (req, res) => {
    const filePath = path.join(UPLOADS_DIR, req.params.filename);
    if (fs.existsSync(filePath)) res.sendFile(filePath);
    else res.status(404).json({ error: 'File not found' });
});

// Auth
app.post('/signup', async (req, res) => {
    console.log("Signup attempt received:", req.body);
    try {
        const { email, password, username } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            email,
            password: hashedPassword,
            username,
            isVerified: false
        });

        const token = user._id; // Using User ID as the verification token
        
        try {
            await sendVerificationEmail(email, token);
            res.json({ success: true, message: 'Signup successful, check your email' });
        } catch (mailErr) {
            console.error("Email Sending Error:", mailErr);
            // Safety: Don't crash the server if Resend blocks the email
            res.json({ 
                success: true, 
                message: 'Signup successful, but Resend blocked the email. Note: In testing mode, you can only send to your own email address.' 
            });
        }
    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ error: 'Signup failed', details: err.message });
    }
});

// Verify Email
app.get('/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;
        // Token is now the user ID
        const user = await User.findById(token);

        if (!user) {
            return res.redirect(`${process.env.APP_URL}/auth.html?error=Invalid or expired token`);
        }

        user.isVerified = true;
        await user.save();

        res.redirect(`${process.env.APP_URL}/auth.html?verified=true`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Verification failed');
    }
});

// Forgot Password
app.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'No account with that email address exists.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        await sendResetEmail(email, token);
        res.json({ success: true, message: 'Password reset link sent to your email.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to process forgot password request.' });
    }
});

// Reset Password
app.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ success: true, message: 'Your password has been reset successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reset password.' });
    }
});

app.post('/login', async (req, res) => {
    console.log("Login attempt received:", req.body ? { ...req.body, password: '***' } : "NO BODY");
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            console.log("Login failed: Invalid credentials for", email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ error: 'Please verify your email before logging in.' });
        }

        res.json({
            success: true,
            token: `mock-token-${Date.now()}`,
            user: {
                email: user.email,
                username: user.username
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});




// Error Handling
app.use((err, req, res, next) => {
    console.error('!!! SERVER ERROR:', err);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});


if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;

