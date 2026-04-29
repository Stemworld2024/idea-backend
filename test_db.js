const mongoose = require('mongoose');
require('dotenv').config();

const ideaSchema = new mongoose.Schema({
    tab: String,
    idea: String,
    description: String
});
const Idea = mongoose.model('Idea', ideaSchema);

async function test() {
    try {
        console.log("Connecting to:", process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected. Finding ideas...");
        const ideas = await Idea.find().limit(1);
        console.log("Found ideas:", ideas);
        process.exit(0);
    } catch (err) {
        console.error("Test failed:", err);
        process.exit(1);
    }
}
test();
