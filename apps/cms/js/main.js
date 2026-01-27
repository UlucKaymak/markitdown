import { checkAuth, attemptLogin, logout } from './auth.js';
import { setupMarkdownEditor, insertFormat, insertTable } from './editor.js';
import { 
    loadProjectsFromJson, 
    handleProjectSubmit, 
    resetProjectForm, 
    handleFolderSelect,
    renderProjects,
    getProjects,
    handleProjectMarkdownUpload,
    handleProjectThumbnailSelect
} from './projects.js';
import { 
    loadBlogPostsFromJson, 
    handleBlogSubmit, 
    resetBlogForm,
    renderBlogPosts,
    getBlogPosts,
    addBlogMediaManually,
    addBlogMediaFromUrl,
    handleBlogMarkdownUpload,
    handleBlogThumbnailSelect
} from './blog.js';
import { toggleList } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadProjectsFromJson();
    loadBlogPostsFromJson();
    setupEventListeners();
});

function setupEventListeners() {
    // Auth
    document.getElementById('login-btn').addEventListener('click', attemptLogin);
    document.getElementById('password-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') attemptLogin();
    });
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Tabs
    const tabProjects = document.getElementById('tab-projects');
    const tabBlog = document.getElementById('tab-blog');
    const projectsManager = document.getElementById('projects-manager');
    const blogManager = document.getElementById('blog-manager');

    tabProjects.addEventListener('click', () => {
        tabProjects.classList.add('active');
        tabProjects.style.borderBottomColor = '#a14aff';
        tabProjects.style.color = '#fff';
        tabBlog.classList.remove('active');
        tabBlog.style.borderBottomColor = 'transparent';
        tabBlog.style.color = '#888';
        projectsManager.style.display = 'block';
        blogManager.style.display = 'none';
    });

    tabBlog.addEventListener('click', () => {
        tabBlog.classList.add('active');
        tabBlog.style.borderBottomColor = '#a14aff';
        tabBlog.style.color = '#fff';
        tabProjects.classList.remove('active');
        tabProjects.style.borderBottomColor = 'transparent';
        tabProjects.style.color = '#888';
        projectsManager.style.display = 'none';
        blogManager.style.display = 'block';
    });

    // Projects
    document.getElementById('project-form').addEventListener('submit', handleProjectSubmit);
    document.getElementById('cancel-btn').addEventListener('click', resetProjectForm);
    document.getElementById('select-folder-btn').addEventListener('click', () => document.getElementById('folder-input').click());
    document.getElementById('folder-input').addEventListener('change', handleFolderSelect);
    document.getElementById('project-select-thumbnail-btn').addEventListener('click', () => document.getElementById('project-thumbnail-input').click());
    document.getElementById('project-thumbnail-input').addEventListener('change', handleProjectThumbnailSelect);
    document.getElementById('project-upload-md-btn').addEventListener('click', () => document.getElementById('project-md-input').click());
    document.getElementById('project-md-input').addEventListener('change', handleProjectMarkdownUpload);
    
    // Media management (manual/URL for projects - currently missing in project.js refactor but added here)
    document.getElementById('add-media-manual-btn').addEventListener('click', () => {
        const path = prompt('Enter media file path:');
        if (path && path.trim()) {
            import('./projects.js').then(m => {
                const files = m.getCurrentMediaFiles();
                if (!files.includes(path.trim())) {
                    files.push(path.trim());
                    m.renderMediaList();
                }
            });
        }
    });
    document.getElementById('add-media-url-btn').addEventListener('click', () => {
        const url = prompt('Enter media URL:');
        if (url && url.trim()) {
            import('./projects.js').then(m => {
                const files = m.getCurrentMediaFiles();
                if (!files.includes(url.trim())) {
                    files.push(url.trim());
                    m.renderMediaList();
                }
            });
        }
    });

    // Import/Export Projects
    document.getElementById('export-json-btn').addEventListener('click', () => {
        const dataStr = JSON.stringify(getProjects(), null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'projects.json';
        link.click();
        URL.revokeObjectURL(url);
    });
    document.getElementById('import-json-btn').addEventListener('click', () => document.getElementById('import-json-file').click());
    document.getElementById('import-json-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                import('./projects.js').then(m => {
                    m.setProjects(Array.isArray(data) ? data : (data.projects || []));
                    m.saveProjects();
                    m.renderProjects();
                });
            } catch (err) { alert('Error importing projects'); }
        };
        reader.readAsText(file);
    });

    // Blog
    document.getElementById('blog-form').addEventListener('submit', handleBlogSubmit);
    document.getElementById('blog-cancel-btn').addEventListener('click', resetBlogForm);
    document.getElementById('blog-add-media-manual-btn').addEventListener('click', addBlogMediaManually);
    document.getElementById('blog-add-media-url-btn').addEventListener('click', addBlogMediaFromUrl);
    document.getElementById('blog-select-thumbnail-btn').addEventListener('click', () => document.getElementById('blog-thumbnail-input').click());
    document.getElementById('blog-thumbnail-input').addEventListener('change', handleBlogThumbnailSelect);
    document.getElementById('blog-upload-md-btn').addEventListener('click', () => document.getElementById('blog-md-input').click());
    document.getElementById('blog-md-input').addEventListener('change', handleBlogMarkdownUpload);

    // Import/Export Blog
    document.getElementById('export-blog-json-btn').addEventListener('click', () => {
        const dataStr = JSON.stringify(getBlogPosts(), null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'posts.json';
        link.click();
        URL.revokeObjectURL(url);
    });
    document.getElementById('import-blog-json-btn').addEventListener('click', () => document.getElementById('import-blog-json-file').click());
    document.getElementById('import-blog-json-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                import('./blog.js').then(m => {
                    m.setBlogPosts(Array.isArray(data) ? data : []);
                    m.saveBlogPosts();
                    m.renderBlogPosts();
                });
            } catch (err) { alert('Error importing blog posts'); }
        };
        reader.readAsText(file);
    });

    // Markdown Editors
    setupMarkdownEditor('project-description', 'project-preview');
    setupMarkdownEditor('blog-description', 'blog-preview');

    // Global helper for markdown buttons (since they use onclick in HTML currently)
    window.insertFormat = insertFormat;
    window.insertTable = insertTable;
    window.toggleList = toggleList;
}
