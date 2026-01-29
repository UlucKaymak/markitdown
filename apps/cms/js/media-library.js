
let mediaFiles = [];
let loaded = false;

export async function initMediaLibrary() {
    if (loaded) return;
    
    // Inject Modal HTML
    const modalHtml = `
    <div id="media-library-modal" class="modal" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Media Library</h3>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                <div class="media-controls">
                    <input type="text" id="media-search" placeholder="Search files..." style="width: 100%; padding: 0.5rem; margin-bottom: 1rem;">
                </div>
                <div id="media-grid" class="media-grid">
                    <p>Loading...</p>
                </div>
            </div>
        </div>
    </div>
    <style>
        .modal {
            position: fixed; 
            z-index: 2000; 
            left: 0;
            top: 0;
            width: 100%; 
            height: 100%; 
            background-color: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .modal-content {
            background-color: #1a1a1a;
            border: 1px solid #333;
            width: 80%;
            max-width: 900px;
            height: 80%;
            display: flex;
            flex-direction: column;
            border-radius: 8px;
        }
        .modal-header {
            padding: 1rem;
            border-bottom: 1px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .close-modal {
            color: #aaa;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        .close-modal:hover { color: #fff; }
        .modal-body {
            padding: 1rem;
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .media-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 1rem;
            overflow-y: auto;
            flex: 1;
        }
        .media-item {
            border: 1px solid #333;
            border-radius: 4px;
            padding: 0.5rem;
            cursor: pointer;
            transition: background 0.2s;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .media-item:hover {
            background-color: #333;
        }
        .media-preview {
            width: 100px;
            height: 100px;
            object-fit: cover;
            margin-bottom: 0.5rem;
            background-color: #000;
        }
        .media-name {
            font-size: 0.8rem;
            word-break: break-all;
            color: #ccc;
        }
    </style>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Event Listeners
    document.querySelector('#media-library-modal .close-modal').addEventListener('click', closeMediaLibrary);
    document.getElementById('media-search').addEventListener('input', (e) => renderMediaGrid(e.target.value));
    
    // Close on click outside
    document.getElementById('media-library-modal').addEventListener('click', (e) => {
        if (e.target.id === 'media-library-modal') closeMediaLibrary();
    });

    loaded = true;
    await fetchMediaIndex();
}

async function fetchMediaIndex() {
    try {
        const response = await fetch('media-index.json?t=' + new Date().getTime()); // Relative to apps/cms/
        if (!response.ok) throw new Error('Failed to load media index');
        mediaFiles = await response.json();
    } catch (err) {
        console.error(err);
        mediaFiles = [];
        document.getElementById('media-grid').innerHTML = '<p>Error loading media index. Please run the generation script.</p>';
    }
}

let currentCallback = null;

export function openMediaLibrary(callback) {
    if (!loaded) initMediaLibrary();
    
    const modal = document.getElementById('media-library-modal');
    if (modal) {
        modal.style.display = 'flex';
        renderMediaGrid();
        currentCallback = callback;
    }
}

export function closeMediaLibrary() {
    const modal = document.getElementById('media-library-modal');
    if (modal) modal.style.display = 'none';
    currentCallback = null;
}

function renderMediaGrid(filter = '') {
    const grid = document.getElementById('media-grid');
    if (!grid) return;

    grid.innerHTML = '';
    
    const filtered = mediaFiles.filter(file => file.toLowerCase().includes(filter.toLowerCase()));

    if (filtered.length === 0) {
        grid.innerHTML = '<p>No files found.</p>';
        return;
    }

    // Sort by name for now, maybe later by date if available in JSON
    filtered.sort().forEach(file => {
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file);
        
        const div = document.createElement('div');
        div.className = 'media-item';
        div.title = file;
        
        const img = document.createElement('img');
        img.className = 'media-preview';
        if (isImage) {
            img.src = '../../' + file; // Relative to CMS index.html
        } else {
            img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0xMyAySDZGE5IDlIN2MyLjc2IDAgNS0yLjI0IDUtNXYyaDV6Ii8+PC9zdmc+'; // Generic file icon
            img.style.padding = '20px';
        }
        
        const name = document.createElement('div');
        name.className = 'media-name';
        name.textContent = file.split('/').pop();

        div.appendChild(img);
        div.appendChild(name);
        
        div.addEventListener('click', () => {
            if (currentCallback) currentCallback(file);
            closeMediaLibrary();
        });

        grid.appendChild(div);
    });
}
