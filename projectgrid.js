// Global state for Lightbox navigation
let currentLightboxImages = []; 
let currentImageIndex = 0;
let allProjects = []; // Store all projects globally

const lightboxElements = {
    overlay: null,
    image: null,
    closeBtn: null,
    prevBtn: null,
    nextBtn: null
};

document.addEventListener('DOMContentLoaded', function() {
    const isProjectsPage = document.body.classList.contains('projects-page');

    if (isProjectsPage) {
        const urlParams = new URLSearchParams(window.location.search);
        const filterParam = urlParams.get('filter');
        const filter = filterParam ? (filterParam.startsWith('#') ? filterParam : '#' + filterParam) : 'all';
        loadProjectThumbnails(filter).then(() => {
            // Check for project ID in URL after projects are loaded
            handleUrlRouting();
        });
    } else {
        loadProjectsSidebar();
    }

    setupLightboxListeners();
    
    // Handle back/forward navigation
    window.addEventListener('popstate', function(event) {
        handleUrlRouting(true);
    });
});

function handleUrlRouting(fromPopState = false) {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    
    if (projectId) {
        const project = allProjects.find(p => p.id === projectId);
        if (project) {
            openProjectModal(project, true);
        }
    } else {
        // If we are on projects page but no project ID, close modal
        if (document.body.classList.contains('projects-page')) {
            closeProjectModal(true);
        }
    }
}

// --- LIGHTBOX LOGIC ---
function setupLightboxListeners() {
    lightboxElements.overlay = document.getElementById('image-lightbox');
    lightboxElements.image = document.getElementById('expanded-image');
    lightboxElements.closeBtn = document.querySelector('.lightbox-close');
    lightboxElements.prevBtn = document.getElementById('lightbox-prev');
    lightboxElements.nextBtn = document.getElementById('lightbox-next');

    if (!lightboxElements.overlay) return;

    lightboxElements.closeBtn.onclick = closeLightbox;

    lightboxElements.prevBtn.onclick = (e) => {
        e.stopPropagation();
        changeImage(-1);
    };
    
    lightboxElements.nextBtn.onclick = (e) => {
        e.stopPropagation();
        changeImage(1);
    };

    lightboxElements.overlay.onclick = (e) => {
        if (e.target === lightboxElements.overlay) closeLightbox();
    };

    document.addEventListener('keydown', (e) => {
        if (lightboxElements.overlay.style.display === 'flex') {
            if (e.key === "ArrowLeft") changeImage(-1);
            if (e.key === "ArrowRight") changeImage(1);
            if (e.key === "Escape") closeLightbox();
        }
    });
}

function openLightbox(index) {
    if (!lightboxElements.overlay || !currentLightboxImages[index]) return;
    currentImageIndex = index;
    updateLightboxImage();
    lightboxElements.overlay.style.display = 'flex'; 
}

function updateLightboxImage() {
    // Reset src first to ensure the browser registers the change
    lightboxElements.image.src = currentLightboxImages[currentImageIndex];
    
    const isMultiple = currentLightboxImages.length > 1;
    lightboxElements.prevBtn.style.display = isMultiple ? 'block' : 'none';
    lightboxElements.nextBtn.style.display = isMultiple ? 'block' : 'none';
}

function changeImage(direction) {
    currentImageIndex += direction;
    if (currentImageIndex >= currentLightboxImages.length) currentImageIndex = 0;
    if (currentImageIndex < 0) currentImageIndex = currentLightboxImages.length - 1;
    updateLightboxImage();
}

function closeLightbox() {
    if (lightboxElements.overlay) {
        lightboxElements.overlay.style.display = 'none';
        lightboxElements.image.src = '';
    }
}


// --- PROJECT LOADING LOGIC ---
async function loadProjectThumbnails(filter = 'all') {
    try {
        const response = await fetch('projects.json');
        if (!response.ok) throw new Error('Failed to load projects.json');

        const projectsData = await response.json();
        allProjects = projectsData; // Update global allProjects
        let projects = allProjects.filter(project => project.enabled === true);

        if (filter !== 'all') {
            projects = projects.filter(project => {
                if (!project.tags) return false;
                if (filter === '#ArtPiece') {
                    return project.tags.includes('#ArtPiece') || project.tags.includes('#ArtPieces');
                }
                return project.tags.includes(filter);
            });
        }

        const projectsGrid = document.querySelector('.projects-grid');
        if (!projectsGrid) return;
        projectsGrid.innerHTML = '';

        if (projects.length === 0) {
            displayNoProjects();
            return;
        }

        projects.forEach((project) => {
            const card = document.createElement('div');
            card.className = 'project-card';
            // Use absolute path for thumbnails if they start with _projects
            const thumbnailUrl = (project.thumbnail && project.thumbnail.startsWith('_projects')) 
                ? '/' + project.thumbnail 
                : (project.thumbnail || 'placeholder.jpg');
            
            const typeRoleText = project.role ? `${project.type} | ${project.role}` : project.type;

            card.innerHTML = `
                <div class="project-thumbnail">
                    <img src="${thumbnailUrl}" alt="${project.title}" loading="lazy">
                    <div class="project-overlay">
                        <h3>${project.title}</h3>
                        <p class="project-type">${typeRoleText}</p>
                    </div>
                </div>
            `;
            card.onclick = () => {
                openProjectModal(project);
            };
            projectsGrid.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading projects:', error);
        displayError();
    }
}

function openProjectModal(project, fromRouting = false) {
    const modal = document.getElementById('project-modal');
    const modalBody = modal.querySelector('.modal-body');

    // Update URL if not called from routing/popstate
    if (!fromRouting) {
        const newUrl = window.location.pathname + "?id=" + project.id;
        history.pushState({ projectId: project.id }, "", newUrl);
    }

    // 1. CLEAR AND RE-POPULATE the lightbox array for THIS specific project
    currentLightboxImages = []; 
    if (project.media) {
        currentLightboxImages = project.media.filter(path => {
            const ext = path.split('.').pop().toLowerCase();
            return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
        });
    }

    let contentGrid = '<div class="modal-content-grid">';

    let mediaItems = [];
    let textItems = [];

    // 2. Prepare Media Items
    if (project.media) {
        project.media.forEach(mediaPath => {
            const ext = mediaPath.split('.').pop().toLowerCase();
            const absolutePath = mediaPath;
            
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                mediaItems.push(`
                    <div class="grid-item grid-item-image expandable-image-container">
                        <img src="${absolutePath}" alt="${project.title}">
                    </div>`);
            } else if (['mp4', 'webm', 'ogg'].includes(ext)) {
                mediaItems.push(`
                    <div class="grid-item grid-item-video">
                        <video controls controlsList="nodownload">
                            <source src="${absolutePath}" type="video/${ext}">
                        </video>
                    </div>`);
            } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
                const audioTitle = mediaPath.split('/').pop().split('.')[0].replace(/[-_]/g, ' ');
                mediaItems.push(`
                    <div class="grid-item grid-item-audio">
                        <div class="audio-wrapper">
                            <div class="audio-title">${audioTitle}</div>
                            <audio controls controlsList="nodownload">
                                <source src="${absolutePath}" type="audio/${ext}">
                            </audio>
                        </div>
                    </div>`);
            }
        });
    }

    // 3. Prepare Text Items
    let description = (project.description || "").replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    description.split(/\n\n+/).filter(p => p.trim()).forEach(p => {
        textItems.push(`<div class="grid-item grid-item-text"><p>${p.replace(/\n/g, '<br>')}</p></div>`);
    });

    // 4. Merge Randomly while preserving order
    let distribution = [];
    for (let i = 0; i < mediaItems.length; i++) distribution.push('media');
    for (let i = 0; i < textItems.length; i++) distribution.push('text');

    // Shuffle the distribution array (Fisher-Yates)
    for (let i = distribution.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [distribution[i], distribution[j]] = [distribution[j], distribution[i]];
    }

    let mIndex = 0;
    let tIndex = 0;
    distribution.forEach(type => {
        if (type === 'media') {
            contentGrid += mediaItems[mIndex++];
        } else {
            contentGrid += textItems[tIndex++];
        }
    });

    contentGrid += '</div>';

    // 4. Inject into Modal
    let tagsHtml = (project.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('');

    // Determine thumbnail URL
    const thumbnailUrl = (project.thumbnail && project.thumbnail.startsWith('_projects')) 
        ? project.thumbnail 
        : (project.thumbnail || 'placeholder.jpg');

    modalBody.innerHTML = `
        <div class="project-overview-header">
            <div class="project-overview-thumbnail">
                <img src="${thumbnailUrl}" alt="${project.title}">
            </div>
            <div class="project-overview-info">
                <h2>${project.title}</h2>
                <div class="modal-meta">
                    <span class="project-type-badge">${project.type}</span>
                    <span class="project-date" style="margin-bottom: 0 !important;">${formatDate(project.date)}</span>
                </div>
                ${project.role ? `<p class="project-role" style="margin-top: 1rem;"><strong>My Role:</strong> ${project.role}</p>` : ''}
            </div>
        </div>
        ${contentGrid}
        <div class="project-tags">${tagsHtml}</div>
    `;

    // 5. ATTACH TRIGGERS (Crucial fix for Lightbox loading)
    const imagesInModal = modalBody.querySelectorAll('.expandable-image-container img');
    imagesInModal.forEach((img, index) => {
        // We use the index of the image within the modal, 
        // which matches the index in our filtered currentLightboxImages array
        img.onclick = () => openLightbox(index);
    });

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.onclick = () => closeProjectModal();
    modal.onclick = (e) => { if (e.target === modal) closeProjectModal(); };
}

function closeProjectModal(fromRouting = false) {
    const modal = document.getElementById('project-modal');
    if (!modal || modal.style.display === 'none') return;

    modal.querySelectorAll('video, audio').forEach(media => media.pause());
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';

    // Update URL if not called from routing/popstate
    if (!fromRouting) {
        history.pushState(null, "", window.location.pathname);
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('_');
    if (parts.length >= 2) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = parseInt(parts[1]) - 1;
        return parts[2] ? `${monthNames[monthIndex]} ${parts[2]}, ${parts[0]}` : `${monthNames[monthIndex]} ${parts[0]}`;
    }
    return dateString;
}

async function loadProjectsSidebar() {
    const sidebarList = document.querySelector('.sidebar-projects');
    if (!sidebarList) return;
    try {
        const response = await fetch('projects.json');
        const projects = await response.json();
        allProjects = projects; // Populate global state
        sidebarList.innerHTML = '';
        projects.filter(p => p.enabled).forEach(p => {
            const li = document.createElement('li');
            // Change: Use query param for link with .html extension
            li.innerHTML = `<a href="projects.html?id=${p.id}" class="project-nav-link">${p.title}</a>`;
            sidebarList.appendChild(li);
        });
    } catch (e) { console.error("Sidebar error", e); }
}

function displayNoProjects() {
    const grid = document.querySelector('.projects-grid');
    if (grid) grid.innerHTML = '<div class="no-projects"><p>No projects available.</p></div>';
}

function displayError() {
    const grid = document.querySelector('.projects-grid');
    if (grid) grid.innerHTML = '<div class="error-message"><p>Error loading projects. Try again later.</p></div>';
}