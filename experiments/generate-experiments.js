const fs = require('fs');
const path = require('path');

// Configuration
const experimentsRoot = path.resolve(__dirname, '../experiments');
const contentDir = path.join(experimentsRoot, '_content');
const outputFile = path.join(experimentsRoot, 'experiments.json');

// Files to exclude (system files, the page itself, scripts, etc.)
const excludedFiles = [
    '.DS_Store'
];

// Supported extensions and their types
const typeMap = {
    // Images
    '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image', '.webp': 'image', '.svg': 'image',
    // Video
    '.mp4': 'video', '.webm': 'video', '.mov': 'video',
    // Audio
    '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio',
    // Text
    '.txt': 'text', '.md': 'text', '.json': 'code', '.js': 'code', '.css': 'code'
};

function scanExperiments() {
    if (!fs.existsSync(contentDir)) {
        console.error(`Directory not found: ${contentDir}`);
        return;
    }

    const files = fs.readdirSync(contentDir);
    const experiments = [];

    files.forEach(file => {
        if (excludedFiles.includes(file)) return;
        
        const filePath = path.join(contentDir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) return;

        const ext = path.extname(file).toLowerCase();
        const type = typeMap[ext] || 'unknown';

        if (type !== 'unknown') {
            experiments.push(file); // Only push the filename
        }
    });

    // No sorting by date if only filenames are stored. Client-side JS can shuffle if needed.

    fs.writeFileSync(outputFile, JSON.stringify(experiments, null, 2));
    console.log(`Generated index for ${experiments.length} experiments at ${outputFile}`);
}

scanExperiments();
