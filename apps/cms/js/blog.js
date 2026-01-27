import { generateId } from './utils.js';
import { updatePreview } from './editor.js';

let blogPosts = [];
let blogEditingId = null;
let blogCurrentMediaFiles = [];

export function getBlogPosts() { return blogPosts; }
export function setBlogPosts(p) { blogPosts = p; }
export function getBlogEditingId() { return blogEditingId; }
export function setBlogEditingId(id) { blogEditingId = id; }

export async function loadBlogPostsFromJson() {
    try {
        const response = await fetch('../../posts.json');
        if (response.ok) {
            blogPosts = await response.json();
            saveBlogPosts();
            renderBlogPosts();
        } else {
            loadBlogPostsFromLocalStorage();
        }
    } catch (error) {
        console.log('Could not load posts.json, using localStorage');
        loadBlogPostsFromLocalStorage();
    }
}

export function loadBlogPostsFromLocalStorage() {
    const stored = localStorage.getItem('portfolio_blog_posts');
    if (stored) {
        blogPosts = JSON.parse(stored);
        renderBlogPosts();
    }
}

export function saveBlogPosts() {
    localStorage.setItem('portfolio_blog_posts', JSON.stringify(blogPosts));
}

export function renderBlogPosts() {
    const blogList = document.getElementById('blog-list');
    if (!blogList) return;
    blogList.innerHTML = '';

    if (blogPosts.length === 0) {
        blogList.innerHTML = '<p class="empty-state">No blog posts yet.</p>';
        return;
    }

    const sortedPosts = [...blogPosts].sort((a, b) => b.date.localeCompare(a.date));

    sortedPosts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'project-card-manager';

        const enabledBadge = post.enabled
            ? '<span class="badge-enabled">Published</span>'
            : '<span class="badge-disabled">Draft</span>';

        card.innerHTML = `
            <div class="project-card-content">
                <h4>${post.title}</h4>
                <p class="project-date-small">${post.date}</p>
                <p class="project-desc-preview">${post.description.substring(0, 100)}${post.description.length > 100 ? '...' : ''}</p>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
                    ${enabledBadge}
                    ${post.media && post.media.length > 0 ? `<span class="media-badge">${post.media.length} media files</span>` : ''}
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
                    ${post.tags ? post.tags.map(tag => `<span class="tag-badge">${tag}</span>`).join('') : ''}
                </div>
            </div>
            <div class="project-card-actions">
                <button class="btn-edit-blog" data-id="${post.id}">Edit</button>
                <button class="btn-delete-blog" data-id="${post.id}">Delete</button>
            </div>
        `;
        blogList.appendChild(card);
    });

    blogList.querySelectorAll('.btn-edit-blog').forEach(btn => {
        btn.addEventListener('click', () => editBlogPost(btn.dataset.id));
    });
    blogList.querySelectorAll('.btn-delete-blog').forEach(btn => {
        btn.addEventListener('click', () => deleteBlogPost(btn.dataset.id));
    });
}

export function handleBlogSubmit(e) {
    e.preventDefault();

    const tagsInput = document.getElementById('blog-tags').value;
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    const post = {
        id: blogEditingId || generateId('blog'),
        title: document.getElementById('blog-title').value,
        date: document.getElementById('blog-date').value,
        description: document.getElementById('blog-description').value,
        media: [...blogCurrentMediaFiles],
        tags: tags,
        enabled: document.getElementById('blog-enabled').checked
    };

    if (blogEditingId) {
        const index = blogPosts.findIndex(p => p.id === blogEditingId);
        blogPosts[index] = post;
    } else {
        blogPosts.unshift(post);
    }

    saveBlogPosts();
    renderBlogPosts();
    resetBlogForm();
}

export function editBlogPost(id) {
    blogEditingId = id;
    const post = blogPosts.find(p => p.id === id);
    if (!post) return;

    document.getElementById('blog-id').value = post.id;
    document.getElementById('blog-title').value = post.title;
    document.getElementById('blog-date').value = post.date;
    document.getElementById('blog-description').value = post.description;
    document.getElementById('blog-tags').value = post.tags ? post.tags.join(', ') : '';
    document.getElementById('blog-enabled').checked = post.enabled !== false;

    blogCurrentMediaFiles = post.media ? [...post.media] : [];
    renderBlogMediaList();

    document.getElementById('blog-form-title').textContent = 'Edit Post';
    document.getElementById('blog-cancel-btn').style.display = 'inline-block';
    document.getElementById('blog-form').scrollIntoView({ behavior: 'smooth', block: 'start' });

    updatePreview(document.getElementById('blog-description'), document.getElementById('blog-preview'));
}

export function deleteBlogPost(id) {
    if (confirm('Are you sure you want to delete this post?')) {
        blogPosts = blogPosts.filter(p => p.id !== id);
        saveBlogPosts();
        renderBlogPosts();
    }
}

export function resetBlogForm() {
    document.getElementById('blog-form').reset();
    blogEditingId = null;
    blogCurrentMediaFiles = [];
    document.getElementById('blog-form-title').textContent = 'Add New Post';
    document.getElementById('blog-cancel-btn').style.display = 'none';
    renderBlogMediaList();
}

export function renderBlogMediaList() {
    const listEl = document.getElementById('blog-media-list');
    if (!listEl) return;
    if (blogCurrentMediaFiles.length === 0) {
        listEl.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No media files added yet</p>';
        return;
    }

    listEl.innerHTML = blogCurrentMediaFiles.map((path, index) => `
        <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: #f5f5f5; border-radius: 4px; margin-bottom: 0.25rem;">
            <span style="flex: 1; font-size: 0.9rem; font-family: monospace;">${path}</span>
            <button type="button" class="btn-remove-blog-media" data-index="${index}" style="padding: 0.25rem 0.5rem; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">Remove</button>
        </div>
    `).join('');

    listEl.querySelectorAll('.btn-remove-blog-media').forEach(btn => {
        btn.addEventListener('click', () => {
            blogCurrentMediaFiles.splice(parseInt(btn.dataset.index), 1);
            renderBlogMediaList();
        });
    });
}

export function addBlogMediaManually() {
    const path = prompt('Enter media file path:');
    if (path && path.trim()) {
        if (!blogCurrentMediaFiles.includes(path.trim())) {
            blogCurrentMediaFiles.push(path.trim());
            renderBlogMediaList();
        }
    }
}

export function addBlogMediaFromUrl() {
    const url = prompt('Enter media URL:');
    if (url && url.trim()) {
        if (!blogCurrentMediaFiles.includes(url.trim())) {
            blogCurrentMediaFiles.push(url.trim());
            renderBlogMediaList();
        }
    }
}
