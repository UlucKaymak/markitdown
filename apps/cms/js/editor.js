let markedConfigured = false;

export function setupMarkdownEditor(textareaId, previewId) {
    const textarea = document.getElementById(textareaId);
    const preview = document.getElementById(previewId);

    if (!textarea || !preview) return;

    const m = window.marked || (typeof marked !== 'undefined' ? marked : null);

    // Configure marked options for image paths (run only once)
    if (m && !markedConfigured) {
        const renderer = new m.Renderer();
        const originalImage = renderer.image.bind(renderer);

        renderer.image = (href, title, text) => {
            let newHref = href;
            // Fix paths for CMS preview
            if (href && !href.startsWith('http') && !href.startsWith('data:')) {
                if (href.startsWith('_projects/')) {
                    newHref = '../../projects/' + href;
                } else if (href.startsWith('blog/') || href.startsWith('_content/')) {
                     if (href.startsWith('blog/')) {
                         newHref = '../../' + href;
                     } else {
                         newHref = '../../blog/' + href;
                     }
                }
            }
            return originalImage(newHref, title, text);
        };
        
        if (typeof m.use === 'function') {
            m.use({ renderer });
        } else if (typeof m.setOptions === 'function') {
            m.setOptions({ renderer });
        }
        
        markedConfigured = true;
    }

    // Initial preview update
    updatePreview(textarea, preview);

    // Update on input
    textarea.addEventListener('input', () => updatePreview(textarea, preview));
}

export function updatePreview(textarea, preview) {
    const content = textarea.value || '';
    
    // Check for marked in global scope (window.marked or just marked)
    const m = window.marked || (typeof marked !== 'undefined' ? marked : null);

    if (m) {
        try {
            // In v4+, it's marked.parse(). In older versions, it might be marked()
            if (typeof m.parse === 'function') {
                preview.innerHTML = m.parse(content);
            } else if (typeof m === 'function') {
                preview.innerHTML = m(content);
            } else {
                preview.innerHTML = content;
                preview.style.whiteSpace = 'pre-wrap';
            }
            // If we successfully parsed, remove pre-wrap if it was added
            if (preview.innerHTML !== content) {
                preview.style.whiteSpace = 'normal';
            }
        } catch (e) {
            console.error('Marked parsing error:', e);
            preview.innerHTML = content;
            preview.style.whiteSpace = 'pre-wrap';
        }
    } else {
        preview.innerHTML = content;
        preview.style.whiteSpace = 'pre-wrap';
    }
}

export function insertFormat(textareaId, before, after) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    const replacement = before + selectedText + after;

    textarea.value = text.substring(0, start) + replacement + text.substring(end);
    
    textarea.focus();
    if (selectedText.length === 0) {
        textarea.selectionStart = start + before.length;
        textarea.selectionEnd = start + before.length;
    } else {
        textarea.selectionStart = start + before.length + selectedText.length + after.length;
        textarea.selectionEnd = start + before.length + selectedText.length + after.length;
    }

    const previewId = textareaId === 'project-description' ? 'project-preview' : 'blog-preview';
    const preview = document.getElementById(previewId);
    updatePreview(textarea, preview);
}

export function insertMedia(textareaId, path) {
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(path);
    const isVideo = /\.(mp4|webm|ogg)$/i.test(path);
    const isAudio = /\.(mp3|wav)$/i.test(path);
    const filename = path.split('/').pop();

    let before = '';
    let after = '';

    if (isImage) {
        before = '![' + filename + '](';
        after = ')';
    } else if (isVideo) {
        before = `<video controls>\n  <source src="`;
        after = `" type="video/${path.split('.').pop()}">\n  Your browser does not support the video tag.\n</video>`;
    } else if (isAudio) {
        before = `<audio controls>\n  <source src="`;
        after = `" type="audio/${path.split('.').pop()}">\n  Your browser does not support the audio tag.\n</audio>`;
    } else {
        before = '[' + filename + '](';
        after = ')';
    }

    // Use insertFormat to handle the insertion
    // For images/links, we want "path" to be in the "url" position.
    // insertFormat(id, before, after) wraps selected text.
    // Here we want to insert the WHOLE string: ![alt](path).
    
    // Actually, simpler: just insert the string.
    // But we want to reuse the cursor placement logic.
    
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    const replacement = isImage ? `![${filename}](${path})` : 
                        (isVideo || isAudio) ? before + path + after :
                        `[${filename}](${path})`;

    textarea.value = text.substring(0, start) + replacement + text.substring(end);
    
    textarea.focus();
    textarea.selectionStart = start + replacement.length;
    textarea.selectionEnd = start + replacement.length;

    const previewId = textareaId === 'project-description' ? 'project-preview' : 'blog-preview';
    const preview = document.getElementById(previewId);
    updatePreview(textarea, preview);
}

export function insertTable(textareaId) {
    const tableTemplate = `
| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
`;
    insertFormat(textareaId, tableTemplate, "");
}

export function insertList(textareaId, type) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    let replacement = "";
    const lines = selectedText.split('\n');
    
    if (type === 'bullet') {
        replacement = lines.map(line => `- ${line}`).join('\n');
    } else if (type === 'number') {
        replacement = lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
    }

    textarea.value = text.substring(0, start) + replacement + text.substring(end);
    
    textarea.focus();
    textarea.selectionStart = start + replacement.length;
    textarea.selectionEnd = start + replacement.length;

    const previewId = textareaId === 'project-description' ? 'project-preview' : 'blog-preview';
    const preview = document.getElementById(previewId);
    updatePreview(textarea, preview);
}
