require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function listResources() {
    try {
        console.log('Listing last 10 resources...');
        const result = await cloudinary.api.resources({ max_results: 10, type: 'upload' });
        console.log('--- Images/PDFs ---');
        result.resources.forEach(r => {
            console.log(`Public ID: ${r.public_id}, Type: ${r.resource_type}, Format: ${r.format}`);
        });

        const resultRaw = await cloudinary.api.resources({ max_results: 10, type: 'upload', resource_type: 'raw' });
        console.log('--- Raw Files (Docs/etc) ---');
        resultRaw.resources.forEach(r => {
            console.log(`Public ID: ${r.public_id}, Type: ${r.resource_type}, Format: ${r.format}`);
        });
    } catch (err) {
        console.error('Failed to list resources:', err);
    }
}

listResources();
