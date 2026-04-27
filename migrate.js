require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs-extra');
const path = require('path');

// MongoDB URI from .env
const MONGODB_URI = process.env.MONGODB_URI;
const DATA_FILE = path.join(__dirname, 'data.json');
const USERS_FILE = path.join(__dirname, 'users.json');

// Schemas
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const ideaSchema = new mongoose.Schema({
    tab: { type: String, required: true },
    idea: String,
    description: String,
    fileName: String,
    fileData: String,
    owner: String,
    status: String,
    comment: String,
    category: String
});

const User = mongoose.model('User', userSchema);
const Idea = mongoose.model('Idea', ideaSchema);

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('Connected!');

        // Migrate Users
        if (await fs.exists(USERS_FILE)) {
            console.log('Migrating Users...');
            const users = await fs.readJson(USERS_FILE);
            for (const user of users) {
                await User.findOneAndUpdate(
                    { email: user.email },
                    user,
                    { upsert: true, new: true }
                );
            }
            console.log(`Migrated ${users.length} users.`);
        }

        // Migrate Ideas
        if (await fs.exists(DATA_FILE)) {
            console.log('Migrating Ideas...');
            const data = await fs.readJson(DATA_FILE);
            let count = 0;
            
            // Clear existing ideas first to avoid duplicates during migration
            await Idea.deleteMany({});

            for (const tab in data) {
                for (const item of data[tab]) {
                    await new Idea({ ...item, tab }).save();
                    count++;
                }
            }
            console.log(`Migrated ${count} ideas across ${Object.keys(data).length} tabs.`);
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
