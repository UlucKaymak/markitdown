import { generateId } from './utils.js';
import { updatePreview } from './editor.js';

let projects = [];
let editingId = null;
let currentMediaFiles = [];

export function getProjects() { return projects; }
export function setProjects(p) { projects = p; }
export function getEditingId() { return editingId; }
export function setEditingId(id) { editingId = id; }
export function getCurrentMediaFiles() { return currentMediaFiles; }
export function setCurrentMediaFiles(files) { currentMediaFiles = files; }

export async function loadProjectsFromJson() {
    try {
        const response = await fetch('../../projects.json');
        if (response.ok) {
            projects = await response.json();
            saveProjects();
            renderProjects();
        } else {
            loadProjectsFromLocalStorage();
        }
    } catch (error) {
        console.log('Could not load projects.json, using localStorage');
        loadProjectsFromLocalStorage();
    }
}

export function loadProjectsFromLocalStorage() {
    const stored = localStorage.getItem('portfolio_projects');
    if (stored) {
        projects = JSON.parse(stored);
        renderProjects();
    }
}

export function saveProjects() {
    localStorage.setItem('portfolio_projects', JSON.stringify(projects));
}

export function renderProjects() {
    const projectsList = document.getElementById('projects-list');
    if (!projectsList) return;
    projectsList.innerHTML = '';

    if (projects.length === 0) {
        projectsList.innerHTML = '<p class="empty-state">No projects yet.</p>';
        return;
    }

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
        
        let thumbSrc = '';
        if (project.thumbnail) {
            thumbSrc = project.thumbnail.startsWith('http') ? project.thumbnail : '../../' + project.thumbnail;
        }

        const thumbnailHTML = thumbSrc
            ? `<img src="${thumbSrc}" alt="${project.title}" class="project-card-thumbnail">`
            : '<div class="project-card-thumbnail" style="display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: #666;">No Image</div>';

        projectCard.innerHTML = `
            ${thumbnailHTML}
            <div class="project-card-content">
                <h4>${project.title}</h4>
                <p class="project-date-small">${project.date} | ${project.type}</p>
                <p class="project-role-small"><strong>Role:</strong> ${project.role || 'N/A'}</p>
                <p class="project-desc-preview">${project.description.substring(0, 100)}${project.description.length > 100 ? '...' : ''}</p>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
                    ${enabledBadge}
                    ${mediaBadge}
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
                    ${project.tags ? project.tags.map(tag => `<span class="tag-badge">${tag}</span>`).join('') : ''}
                </div>
            </div>
            <div class="project-card-actions">
                <button class="btn-edit" data-id="${project.id}">Edit</button>
                <button class="btn-delete" data-id="${project.id}">Delete</button>
            </div>
        `;
        projectsList.appendChild(projectCard);
    });

    // Add event listeners to buttons
    projectsList.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editProject(btn.dataset.id));
    });
    projectsList.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteProject(btn.dataset.id));
    });
}

export function handleProjectSubmit(e) {
    e.preventDefault();

    const tagsInput = document.getElementById('project-tags').value;
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    const project = {
        id: editingId || generateId('project'),
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
        const index = projects.findIndex(p => p.id === editingId);
        projects[index] = project;
    } else {
        projects.unshift(project);
    }

    saveProjects();
    renderProjects();
    resetProjectForm();
}

export function editProject(id) {
    editingId = id;
    const project = projects.find(p => p.id === id);
    if (!project) return;

    document.getElementById('project-id').value = project.id;
    document.getElementById('project-title').value = project.title;
    document.getElementById('project-type').value = project.type || '';
    document.getElementById('project-date').value = project.date;
    document.getElementById('project-description').value = project.description;
    document.getElementById('project-role').value = project.role || '';
    document.getElementById('project-thumbnail').value = project.thumbnail || '';
    document.getElementById('project-tags').value = project.tags ? project.tags.join(', ') : '';
    document.getElementById('project-enabled').checked = project.enabled !== false;

    currentMediaFiles = project.media ? [...project.media] : [];
    renderMediaList();

    document.getElementById('form-title').textContent = 'Edit Project';
    document.getElementById('cancel-btn').style.display = 'inline-block';
    document.getElementById('project-form').scrollIntoView({ behavior: 'smooth', block: 'start' });

    updatePreview(document.getElementById('project-description'), document.getElementById('project-preview'));
}

export function deleteProject(id) {
    if (confirm('Are you sure you want to delete this project?')) {
        projects = projects.filter(p => p.id !== id);
        saveProjects();
        renderProjects();
    }
}

export function resetProjectForm() {
    document.getElementById('project-form').reset();
    editingId = null;
    currentMediaFiles = [];
    document.getElementById('form-title').textContent = 'Add New Project';
    document.getElementById('cancel-btn').style.display = 'none';
    renderMediaList();
}

export function handleFolderSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov', '.mp3', '.wav', '.ogg'];
    const mediaFiles = files.filter(file => {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        return mediaExtensions.includes(ext);
    });

    mediaFiles.forEach(file => {
        const relativePath = file.webkitRelativePath;
        const projectPath = '_projects/' + relativePath;
        if (!currentMediaFiles.includes(projectPath)) {
            currentMediaFiles.push(projectPath);
        }
    });

    renderMediaList();
    e.target.value = '';
}

export function handleProjectMarkdownUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const content = event.target.result;
        const textarea = document.getElementById('project-description');
        const preview = document.getElementById('project-preview');
        textarea.value = content;
        updatePreview(textarea, preview);
    };
    reader.readAsText(file);
}

export function handleProjectThumbnailSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Suggest a path based on typical structure
    const path = `projects/${file.name}`;
    document.getElementById('project-thumbnail').value = path;
}

export function renderMediaList() {
    const listEl = document.getElementById('media-list');
    if (!listEl) return;
    if (currentMediaFiles.length === 0) {
        listEl.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No media files added yet</p>';
        return;
    }

    listEl.innerHTML = currentMediaFiles.map((path, index) => `
        <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: #f5f5f5; border-radius: 4px; margin-bottom: 0.25rem;">
            <span style="flex: 1; font-size: 0.9rem; font-family: monospace;">${path}</span>
            <button type="button" class="btn-remove-media" data-index="${index}" style="padding: 0.25rem 0.5rem; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">Remove</button>
        </div>
    `).join('');

    listEl.querySelectorAll('.btn-remove-media').forEach(btn => {
        btn.addEventListener('click', () => {
            currentMediaFiles.splice(parseInt(btn.dataset.index), 1);
            renderMediaList();
        });
    });
}
