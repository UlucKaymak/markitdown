// Global state for Lightbox navigation
let currentLightboxImages = []; 
let currentImageIndex = 0;
let allPosts = []; // Store all blog posts globally

const lightboxElements = {
    overlay: null,
    image: null,
    closeBtn: null,
    prevBtn: null,
    nextBtn: null
};

document.addEventListener('DOMContentLoaded', function() {
    loadBlogPosts().then(() => {
        // Check for post ID in URL after posts are loaded
        handleUrlRouting();
    });

    setupLightboxListeners();
    
    // Handle back/forward navigation
    window.addEventListener('popstate', function(event) {
        handleUrlRouting(true);
    });
});

function handleUrlRouting(fromPopState = false) {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    
    if (postId) {
        const post = allPosts.find(p => p.id === postId);
        if (post) {
            openPostModal(post, true);
        }
    } else {
        // If we are on blog page but no post ID, close modal
        if (document.body.classList.contains('blog-page')) {
            closePostModal(true);
        }
    }
}

// --- LIGHTBOX LOGIC (Reused from projectgrid.js) ---
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


// --- BLOG POST LOADING LOGIC ---
async function loadBlogPosts() {
    try {
        const response = await fetch('posts.json');
        if (!response.ok) throw new Error('Failed to load posts.json');

        const postsData = await response.json();
        allPosts = postsData.filter(post => post.enabled === true);

        const blogList = document.querySelector('.blog-list');
        if (!blogList) return;
        blogList.innerHTML = '';

        if (allPosts.length === 0) {
            displayNoPosts();
            return;
        }

        allPosts.forEach((post) => {
            const card = document.createElement('div');
            card.className = 'blog-post-card';
            
            // Format description for excerpt (remove links, take first paragraph)
            const cleanDesc = (post.description || "").replace(/[\[\]\( \)]/g, '$1');
            const excerpt = cleanDesc.split('\n')[0].substring(0, 150) + '...';
            
            const tagsHtml = (post.tags || []).map(tag => `<span class="blog-tag">${tag}</span>`).join('');

            card.innerHTML = `
                <div class="blog-post-header">
                    <h2 class="blog-post-title">${post.title}</h2>
                    <div class="blog-post-meta">
                        <span class="blog-post-date">${formatDate(post.date)}</span>
                    </div>
                </div>
                <p class="blog-post-excerpt">${excerpt}</p>
                <div class="blog-tags">${tagsHtml}</div>
                <div style="margin-top: 1rem;">
                    <span class="blog-read-more">Read Article</span>
                </div>
            `;
            card.onclick = () => {
                openPostModal(post);
            };
            blogList.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading posts:', error);
        displayError();
    }
}

function openPostModal(post, fromRouting = false) {
    const modal = document.getElementById('project-modal');
    const modalBody = modal.querySelector('.modal-body');

    // Update URL if not called from routing/popstate
    if (!fromRouting) {
        const newUrl = window.location.pathname + "?id=" + post.id;
        history.pushState({ postId: post.id }, "", newUrl);
    }

    // 1. CLEAR AND RE-POPULATE the lightbox array for THIS specific post
    currentLightboxImages = []; 
    if (post.media) {
        currentLightboxImages = post.media.filter(path => {
            const ext = path.split('.').pop().toLowerCase();
            return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
        });
    }

    let contentGrid = '<div class="modal-content-grid">';

    // Similar logic to projects, but focused on text first
    let mediaItems = [];
    let textItems = [];

    // 2. Prepare Media Items
    if (post.media) {
        post.media.forEach(mediaPath => {
            const ext = mediaPath.split('.').pop().toLowerCase();
            const absolutePath = mediaPath;
            
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                mediaItems.push(`
                    <div class="grid-item grid-item-image expandable-image-container">
                        <img src="${absolutePath}" alt="${post.title}">
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
    let description = (post.description || "").replace(/[\[\]\( \)]/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    description.split(/\n\n+/).filter(p => p.trim()).forEach(p => {
        textItems.push(`<div class="grid-item grid-item-text"><p>${p.replace(/\n/g, '<br>')}</p></div>`);
    });

    // 4. Interleave text and media - for blog, prefer text then media, or just append media at end or beginning
    // For simplicity, let's just dump text then media
    textItems.forEach(item => contentGrid += item);
    mediaItems.forEach(item => contentGrid += item);

    contentGrid += '</div>';

    // 4. Inject into Modal
    let tagsHtml = (post.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('');

    modalBody.innerHTML = `
        <div class="project-overview-header" style="flex-direction: column; gap: 0.5rem;">
            <div class="project-overview-info" style="width: 100%;">
                <h2 style="font-size: 2rem; margin-bottom: 0.5rem;">${post.title}</h2>
                <div class="modal-meta">
                    <span class="blog-modal-date">${formatDate(post.date)}</span>
                </div>
            </div>
        </div>
        ${contentGrid}
        <div class="project-tags" style="margin-top: 2rem; border-top: 1px solid var(--border); padding-top: 1rem;">${tagsHtml}</div>
    `;

    // 5. ATTACH TRIGGERS
    const imagesInModal = modalBody.querySelectorAll('.expandable-image-container img');
    imagesInModal.forEach((img, index) => {
        img.onclick = () => openLightbox(index);
    });

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.onclick = () => closePostModal();
    modal.onclick = (e) => { if (e.target === modal) closePostModal(); };
}

function closePostModal(fromRouting = false) {
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

function displayNoPosts() {
    const list = document.querySelector('.blog-list');
    if (list) list.innerHTML = '<div class="no-projects"><p>No posts available yet.</p></div>';
}

function displayError() {
    const list = document.querySelector('.blog-list');
    if (list) list.innerHTML = '<div class="error-message"><p>Error loading posts. Try again later.</p></div>';
}
