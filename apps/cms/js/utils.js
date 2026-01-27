export function generateId(type) {
    const titleInput = type === 'project' ? document.getElementById('project-title') : document.getElementById('blog-title');
    const dateInput = type === 'project' ? document.getElementById('project-date') : document.getElementById('blog-date');
    
    const title = titleInput.value;
    const slug = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    return `${slug}`.substring(0, 50);
}

export function toggleList(listId, headerEl) {
    const list = document.getElementById(listId);
    const icon = headerEl.querySelector('.toggle-icon');
    if (list.style.display === 'none') {
        list.style.display = 'flex';
        icon.textContent = '▼';
    } else {
        list.style.display = 'none';
        icon.textContent = '▶';
    }
}
