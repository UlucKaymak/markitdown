const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../../'); // Go up from apps/cms/scripts to root
const outputFile = path.resolve(__dirname, '../media-index.json');

const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.webm', '.mp3', '.wav', '.pdf'];
const ignoreDirs = ['.git', 'node_modules', '.gemini'];

function scanDir(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (!ignoreDirs.includes(file)) {
                scanDir(filePath, fileList);
            }
        } else {
            const ext = path.extname(file).toLowerCase();
            if (mediaExtensions.includes(ext)) {
                // Make path relative to root
                const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
                fileList.push(relativePath);
            }
        }
    });

    return fileList;
}

console.log('Scanning for media files...');
const mediaFiles = scanDir(rootDir);
console.log(`Found ${mediaFiles.length} files.`);

fs.writeFileSync(outputFile, JSON.stringify(mediaFiles, null, 2));
console.log(`Index written to ${outputFile}`);

