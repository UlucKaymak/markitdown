// Content Manager JavaScript

// Initialize data structure
let projects = [];
let editingId = null;
let currentMediaFiles = [];

// DOM Elements
const projectForm = document.getElementById('project-form');
const projectsList = document.getElementById('projects-list');
const cancelBtn = document.getElementById('cancel-btn');
const formTitle = document.getElementById('form-title');
const exportJsonBtn = document.getElementById('export-json-btn');
const importJsonBtn = document.getElementById('import-json-btn');
const importJsonFile = document.getElementById('import-json-file');
const selectFolderBtn = document.getElementById('select-folder-btn');
const addMediaManualBtn = document.getElementById('add-media-manual-btn');
const folderInput = document.getElementById('folder-input');
const mediaList = document.getElementById('media-list');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadProjectsFromJson();
    setupEventListeners();
});

function setupEventListeners() {
    // Project form
    projectForm.addEventListener('submit', handleProjectSubmit);
    cancelBtn.addEventListener('click', cancelEdit);

    // Media management
    selectFolderBtn.addEventListener('click', () => folderInput.click());
    folderInput.addEventListener('change', handleFolderSelect);
    addMediaManualBtn.addEventListener('click', addMediaManually);

    // Import/Export
    exportJsonBtn.addEventListener('click', exportToProjectsJson);
    importJsonBtn.addEventListener('click', () => importJsonFile.click());
    importJsonFile.addEventListener('change', importFromJson);
}

// Load projects from projects.json file
async function loadProjectsFromJson() {
    try {
        const response = await fetch('projects.json');
        if (response.ok) {
            projects = await response.json();
            // Also save to localStorage as working copy
            localStorage.setItem('portfolio_projects', JSON.stringify(projects));
            loadProjects();
        } else {
            // If projects.json doesn't exist, try loading from localStorage
            loadProjectsFromLocalStorage();
        }
    } catch (error) {
        console.log('Could not load projects.json, using localStorage');
        loadProjectsFromLocalStorage();
    }
}

function loadProjectsFromLocalStorage() {
    const stored = localStorage.getItem('portfolio_projects');
    if (stored) {
        projects = JSON.parse(stored);
        loadProjects();
    }
}

// Handle folder selection for media import
function handleFolderSelect(e) {
    const files = Array.from(e.target.files);

    if (files.length === 0) return;

    // Get the folder path from the first file
    const folderPath = files[0].webkitRelativePath.split('/')[0];

    // Filter for media files (images, videos, audio)
    const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov', '.mp3', '.wav', '.ogg'];
    const mediaFiles = files.filter(file => {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        return mediaExtensions.includes(ext);
    });

    // Add to current media files list
    mediaFiles.forEach(file => {
        const relativePath = file.webkitRelativePath;
        // Convert to projects/ relative path
        const projectPath = 'projects/' + relativePath;
        if (!currentMediaFiles.includes(projectPath)) {
            currentMediaFiles.push(projectPath);
        }
    });

    renderMediaList();
    folderInput.value = ''; // Reset input
}

// Add media file manually
function addMediaManually() {
    const path = prompt('Enter media file path (e.g., projects/2025_08-project/image.jpg):');
    if (path && path.trim()) {
        if (!currentMediaFiles.includes(path.trim())) {
            currentMediaFiles.push(path.trim());
            renderMediaList();
        }
    }
}

// Render media files list
function renderMediaList() {
    if (currentMediaFiles.length === 0) {
        mediaList.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No media files added yet</p>';
        return;
    }

    mediaList.innerHTML = currentMediaFiles.map((path, index) => `
        <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: #f5f5f5; border-radius: 4px; margin-bottom: 0.25rem;">
            <span style="flex: 1; font-size: 0.9rem; font-family: monospace;">${path}</span>
            <button type="button" onclick="removeMediaFile(${index})" style="padding: 0.25rem 0.5rem; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">Remove</button>
        </div>
    `).join('');
}

// Remove media file
function removeMediaFile(index) {
    currentMediaFiles.splice(index, 1);
    renderMediaList();
}

// Project Management
function handleProjectSubmit(e) {
    e.preventDefault();

    const tagsInput = document.getElementById('project-tags').value;
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    const project = {
        id: editingId || generateId(),
        title: document.getElementById('project-title').value,
        type: document.getElementById('project-type').value,
        date: document.getElementById('project-date').value,
        description: document.getElementById('project-description').value,
        role: document.getElementById('project-role').value,
        thumbnail: document.getElementById('project-thumbnail').value,
        media: [...currentMediaFiles],
        tags: tags,
        enabled: document.getElementById('project-enabled').checked
    };

    if (editingId) {
        // Update existing
        const index = projects.findIndex(p => p.id === editingId);
        projects[index] = project;
    } else {
        // Add new project to the top of the list
        projects.unshift(project);
    }

    saveProjects();
    loadProjects();
    resetForm();
}

function generateId() {
    const title = document.getElementById('project-title').value;
    const date = document.getElementById('project-date').value;
    // Create a simple slug from title
    const slug = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    return `${date}-${slug}`.substring(0, 50);
}

function saveProjects() {
    localStorage.setItem('portfolio_projects', JSON.stringify(projects));
}

function loadProjects() {
    projectsList.innerHTML = '';

    if (projects.length === 0) {
        projectsList.innerHTML = '<p class="empty-state">No projects yet. Add your first project above!</p>';
        return;
    }

    // Sort by date descending
    const sortedProjects = [...projects].sort((a, b) => b.date.localeCompare(a.date));

    sortedProjects.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card-manager';

        const enabledBadge = project.enabled
            ? '<span class="badge-enabled">Enabled</span>'
            : '<span class="badge-disabled">Disabled</span>';

        const mediaBadge = project.media && project.media.length > 0
            ? `<span class="media-badge">${project.media.length} media files</span>`
            : '';

        projectCard.innerHTML = `
            <div class="project-card-content">
                <h4>${project.title}</h4>
                <p class="project-date-small">${project.date} | ${project.type}</p>
                <p class="project-role-small"><strong>Role:</strong> ${project.role || 'N/A'}</p>
                <p class="project-desc-preview">${project.description.substring(0, 100)}${project.description.length > 100 ? '...' : ''}</p>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
                    ${enabledBadge}
                    ${mediaBadge}
                    ${project.tags ? project.tags.map(tag => `<span class="tag-badge">${tag}</span>`).join('') : ''}
                </div>
            </div>
            <div class="project-card-actions">
                <button class="btn-edit" onclick="editProject('${project.id}')">Edit</button>
                <button class="btn-delete" onclick="deleteProject('${project.id}')">Delete</button>
            </div>
        `;
        projectsList.appendChild(projectCard);
    });
}

function editProject(id) {
    editingId = id;
    const project = projects.find(p => p.id === id);

    document.getElementById('project-id').value = project.id;
    document.getElementById('project-title').value = project.title;
    document.getElementById('project-type').value = project.type || '';
    document.getElementById('project-date').value = project.date;
    document.getElementById('project-description').value = project.description;
    document.getElementById('project-role').value = project.role || '';
    document.getElementById('project-thumbnail').value = project.thumbnail || '';
    document.getElementById('project-tags').value = project.tags ? project.tags.join(', ') : '';
    document.getElementById('project-enabled').checked = project.enabled !== false;

    // Load media files
    currentMediaFiles = project.media ? [...project.media] : [];
    renderMediaList();

    formTitle.textContent = 'Edit Project';
    cancelBtn.style.display = 'inline-block';

    // Scroll to form
    projectForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function deleteProject(id) {
    if (confirm('Are you sure you want to delete this project?')) {
        projects = projects.filter(p => p.id !== id);
        saveProjects();
        loadProjects();
    }
}

function cancelEdit() {
    resetForm();
}

function resetForm() {
    projectForm.reset();
    editingId = null;
    currentMediaFiles = [];
    formTitle.textContent = 'Add New Project';
    cancelBtn.style.display = 'none';
    renderMediaList();
}

// Export to projects.json format
function exportToProjectsJson() {
    const dataStr = JSON.stringify(projects, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'projects.json';
    link.click();

    URL.revokeObjectURL(url);

    alert('projects.json exported! Replace the existing projects.json file in your project folder with this file.');
}

// Import from JSON file
function importFromJson(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);

            // Check if it's an array (projects.json format) or object (old backup format)
            if (Array.isArray(data)) {
                projects = data;
            } else if (data.projects) {
                projects = data.projects;
            } else {
                alert('Invalid JSON format. Please provide a valid projects.json file.');
                return;
            }

            saveProjects();
            loadProjects();

            alert('Projects imported successfully!');
        } catch (error) {
            alert('Error importing data. Please check the file format.');
            console.error(error);
        }
    };
    reader.readAsText(file);

    // Reset file input
    importJsonFile.value = '';
}

// Make functions global for onclick handlers
window.editProject = editProject;
window.deleteProject = deleteProject;
window.removeMediaFile = removeMediaFile;
