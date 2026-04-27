const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
// const cloudinary = require('./cloudinary');
const crypto = require('crypto');
// const { sendVerificationEmail, sendResetEmail } = require('./mailer');




const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Root Route for Vercel health check
app.get("/", (req, res) => {
    res.send("Backend is working ✅");
});



// MongoDB Connection
/*
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('MongoDB Connection Error:', err));
*/

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
    cloudinaryId: String,
    owner: String,
    status: String,
    comment: String,
    category: String,
    createdAt: { type: Date, default: Date.now }
});


const User = mongoose.model('User', userSchema);
const Idea = mongoose.model('Idea', ideaSchema);

// File Upload Config
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// API Endpoints

// Get all data
app.get('/api/data', async (req, res) => {
    try {
        const ideas = await Idea.find();
        // Transform array into the tabbed object structure the frontend expects
        const structuredData = {
            openterra: ideas.filter(i => i.tab === 'openterra'),
            stemworld: ideas.filter(i => i.tab === 'stemworld'),
            others: ideas.filter(i => i.tab === 'others')
        };
        res.json(structuredData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Save/Update an idea (New endpoint for granular updates if needed, but keeping bulk post for compatibility)
app.post('/api/data', async (req, res) => {
    try {
        const frontendData = req.body; // { openterra: [], stemworld: [], others: [] }

        // This is a bulk overwrite to match the previous JSON behavior
        // In a real app, we would update individual items, but for now we'll sync the database
        await Idea.deleteMany({}); // Clear existing

        const ideasToInsert = [];
        for (const tab in frontendData) {
            frontendData[tab].forEach(item => {
                ideasToInsert.push({ ...item, tab });
            });
        }

        if (ideasToInsert.length > 0) {
            await Idea.insertMany(ideasToInsert);
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to sync data' });
    }
});

// Upload file to Cloudinary
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const { tab } = req.body;
        const folderName = tab === 'openterra' ? 'openterra_files' :
            (tab === 'stemworld' ? 'stemworld_files' : 'other_files');

        // Upload to Cloudinary
        /* 
        const result = await cloudinary.uploader.upload(req.file.path, {
            resource_type: 'auto', // Support non-image files too
            folder: folderName
        });
        */
        const result = { secure_url: 'https://via.placeholder.com/150', public_id: 'mock_id' };


        // Cleanup local temp file
        await fs.remove(req.file.path);

        res.json({
            success: true,
            url: result.secure_url,
            public_id: result.public_id,
            originalName: req.file.originalname
        });
    } catch (err) {
        console.error('Cloudinary Upload Error:', err);
        res.status(500).json({ error: 'Upload to Cloudinary failed' });
    }
});

// Delete file from Cloudinary
app.post('/api/delete-file', async (req, res) => {
    try {
        const { public_id } = req.body;
        if (!public_id) return res.status(400).json({ error: 'Public ID is required' });

        // const result = await cloudinary.uploader.destroy(public_id);
        const result = { result: 'ok' };
        res.json({ success: true, result });
    } catch (err) {
        console.error('Cloudinary Delete Error:', err);
        res.status(500).json({ error: 'Delete from Cloudinary failed' });
    }
});


// Download file
app.get('/api/download/:filename', (req, res) => {
    const filePath = path.join(UPLOADS_DIR, req.params.filename);
    if (fs.existsSync(filePath)) res.download(filePath);
    else res.status(404).json({ error: 'File not found' });
});

// Auth
app.post('/api/signup', async (req, res) => {
    try {
        const { email, password, username } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const newUser = new User({
            email,
            password: hashedPassword,
            username: username,
            verificationToken: verificationToken,
            isVerified: false
        });
        await newUser.save();


        // Send Email
        try {
            // await sendVerificationEmail(email, verificationToken);
            res.json({ success: true, message: 'Signup successful! [MOCK: Email sending disabled]' });
        } catch (mailErr) {
            console.error('Mail Error:', mailErr);
            res.json({ success: true, message: 'User created, but failed to send verification email.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Signup failed' });
    }
});

// Verify Email
app.get('/api/verify-email/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({ verificationToken: token });

        if (!user) {
            return res.redirect(`${process.env.APP_URL}/auth.html?error=Invalid or expired token`);
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        res.redirect(`${process.env.APP_URL}/auth.html?verified=true`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Verification failed');
    }
});

// Forgot Password
app.post('/api/forgot-password', async (req, res) => {
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

        // await sendResetEmail(email, token);
        res.json({ success: true, message: 'Password reset link sent! [MOCK: Email sending disabled]' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to process forgot password request.' });
    }
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
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

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
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



module.exports = app;
