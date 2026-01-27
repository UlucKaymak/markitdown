export function setupMarkdownEditor(textareaId, previewId) {
    const textarea = document.getElementById(textareaId);
    const preview = document.getElementById(previewId);

    if (!textarea || !preview) return;

    // Initial preview update
    updatePreview(textarea, preview);

    // Update on input
    textarea.addEventListener('input', () => updatePreview(textarea, preview));
}

export function updatePreview(textarea, preview) {
    if (typeof marked !== 'undefined') {
        preview.innerHTML = marked.parse(textarea.value);
    } else {
        preview.innerHTML = textarea.value;
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
