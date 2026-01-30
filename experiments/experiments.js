document.addEventListener('DOMContentLoaded', () => {
    loadExperiments();
});

// Supported extensions and their types (client-side simplified version)
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

async function loadExperiments() {
    console.log('Starting to load experiments...');
    const grid = document.getElementById('experiments-grid');
    
    if (!grid) {
        console.error('Grid element not found!');
        return;
    }

    try {
        // Use a relative path that works regardless of trailing slash
        const response = await fetch('./experiments.json?t=' + Date.now());
        console.log('Fetch response status:', response.status);
        
        if (!response.ok) throw new Error(`Failed to load experiments index: ${response.status}`);
        
        let filenames = await response.json();
        console.log('Loaded filenames:', filenames.length);

        // Transform filenames into experiment objects
        let experiments = filenames.map(filename => {
            const ext = '.' + filename.split('.').pop().toLowerCase(); // Extract extension
            const type = typeMap[ext] || 'unknown';
            const path = `/experiments/_content/${filename}`; // Construct path
            return { filename, path, type, extension: ext };
        }).filter(item => item.type !== 'unknown'); // Filter out unknown types
        
        console.log('Processed experiments:', experiments.length);
        
        // Shuffle the experiments array
        shuffleArray(experiments);

        // Clear loading state
        grid.innerHTML = '';

        if (experiments.length === 0) {
            grid.innerHTML = '<div style="padding:1rem; color:var(--text-secondary);">No experiments found.</div>';
            return;
        }

        experiments.forEach(item => {
            const card = document.createElement('div');
            card.className = 'experiment-item';
            
            let contentHtml = '';

            // Generate content based on type
            try {
                switch (item.type) {
                    case 'image':
                        contentHtml = `<img class="experiment-content" src="${item.path}" alt="${item.filename}" loading="lazy">`;
                        break;
                    case 'video':
                        contentHtml = `
                            <video class="experiment-content" controls preload="metadata" autoplay loop muted playsinline>
                                <source src="${item.path}" type="video/${item.extension.replace('.', '')}">
                                Your browser does not support the video tag.
                            </video>`;
                        break;
                    case 'audio':
                        contentHtml = `
                            <div class="experiment-audio-container">
                                <div style="font-size:3rem; margin-bottom:0.5rem;">🎵</div>
                                <audio controls preload="none">
                                    <source src="${item.path}" type="audio/${item.extension.replace('.', '')}">
                                </audio>
                            </div>`;
                        break;
                    case 'text':
                    case 'code':
                        contentHtml = `<div class="experiment-text" data-src="${item.path}">Loading text...</div>`;
                        fetchTextContent(item.path, card);
                        break;
                    default:
                        contentHtml = `<div style="padding:2rem; text-align:center;">?</div>`;
                }

                card.innerHTML = `
                    ${contentHtml}
                    <div class="experiment-meta">
                        <span title="${item.filename}">${truncateFilename(item.filename)}</span>

                    </div>
                `;
                
                grid.appendChild(card);
            } catch (err) {
                console.error('Error rendering item:', item, err);
            }
        });

    } catch (error) {
        console.error('Error loading experiments:', error);
        grid.innerHTML = `<div style="color:red; padding:1rem;">Error: ${error.message}. <br>Make sure to run the index generator.</div>`;
    }
}

function truncateFilename(name) {
    if (name.length > 20) {
        return name.substring(0, 10) + '...' + name.substring(name.length - 7);
    }
    return name;
}

function fetchTextContent(url, cardElement) {
    fetch(url)
        .then(res => res.text())
        .then(text => {
            const container = cardElement.querySelector('.experiment-text');
            if (container) {
                // Escape HTML to prevent XSS if we render raw text
                container.textContent = text.substring(0, 1000) + (text.length > 1000 ? '\n... (truncated)' : '');
            }
        })
        .catch(() => {
            const container = cardElement.querySelector('.experiment-text');
            if (container) container.textContent = "Error loading text.";
        });
}

// Fisher-Yates (Knuth) Shuffle
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

