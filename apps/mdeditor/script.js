const editor = document.getElementById('editor');
const preview = document.getElementById('preview');

function updatePreview() {
    const text = editor.value;
    preview.innerHTML = marked.parse(text);
}

// Metin değiştikçe önizlemeyi güncelle
editor.addEventListener('input', updatePreview);

// Format Ekleme Fonksiyonu
window.insertFormat = function(before, after) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const text = editor.value;
    const selectedText = text.substring(start, end);

    const replacement = before + selectedText + after;
    
    editor.value = text.substring(0, start) + replacement + text.substring(end);
    
    // İmleci içeriğin arasına veya sonuna yerleştir
    editor.focus();
    if (selectedText.length === 0) {
        editor.selectionStart = start + before.length;
        editor.selectionEnd = start + before.length;
    } else {
        editor.selectionStart = start + before.length + selectedText.length + after.length;
        editor.selectionEnd = start + before.length + selectedText.length + after.length;
    }
    
    updatePreview();
}

// Tablo Ekleme Fonksiyonu
window.insertTable = function() {
    const tableTemplate = `
| Başlık 1 | Başlık 2 |
| -------- | -------- |
| Hücre 1  | Hücre 2  |
| Hücre 3  | Hücre 4  |
`;
    insertFormat(tableTemplate, "");
}

// Başlangıç içeriği (Opsiyonel)
const initialText = `# Merhaba!

Bu senin **Markdown** editörün.

* Madde 1
* Madde 2

\`\`\`python
print('Selam Dünya!')
\`\`\``;
editor.value = initialText;
updatePreview();
