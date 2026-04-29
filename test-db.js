const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
    console.log('Testing MongoDB connection...');
    console.log('URI:', process.env.MONGODB_URI ? 'FOUND' : 'MISSING');
    
    if (!process.env.MONGODB_URI) {
        console.error('Error: MONGODB_URI is not defined in .env');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected successfully!');
        
        const ideaSchema = new mongoose.Schema({
            tab: String,
            idea: String
        });
        const Idea = mongoose.models.Idea || mongoose.model('Idea', ideaSchema);
        
        console.log('Fetching ideas...');
        const ideas = await Idea.find();
        console.log('Found ideas count:', ideas.length);
        console.log('First 3 ideas:', ideas.slice(0, 3));
        
        process.exit(0);
    } catch (err) {
        console.error('Connection failed:', err);
        process.exit(1);
    }
}

test();
