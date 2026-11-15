// markitdown-core.js
// Sorumluluklar: State yönetimi, Markdown parsing (marked.js), Mermaid entegrasyonu,
// Görsel/asset işleme (blob URL yönetimi) ve dosya G/Ç (IndexedDB handle'lari, aç/kaydet).
// Not: updateUI(), triggerSaveEffect() ve copyCodeBlock() markitdown-ui.js icinde tanimlidir;
// bu dosya calisirken cagrilmazlar (yalnizca kullanici etkilesiminde, DOMContentLoaded sonrasi
// cagrilirlar), bu yuzden markitdown-ui.js bu dosyadan SONRA yuklenmelidir.

const ACCENTS = {
    blue: { dark: '#89b4fa', light: '#1e66f5', bgDark: '#0d0f16', borderDark: '#1b1e28', toolbarDark: '#08090d' },
    green: { dark: '#a6e3a1', light: '#40a02b', bgDark: '#0d110d', borderDark: '#1b221b', toolbarDark: '#080a08' },
    mauve: { dark: '#cba6f7', light: '#8839ef', bgDark: '#110d16', borderDark: '#201b2a', toolbarDark: '#0a080d' },
    red: { dark: '#f38ba8', light: '#d20f39', bgDark: '#140d0d', borderDark: '#281b1b', toolbarDark: '#0b0808' }
};

const state = {
    md: '',
    fileName: 'Opening.md',
    mode: 'reading',
    theme: localStorage.getItem('theme') || 'light',
    accentKey: localStorage.getItem('accentKey') || 'blue',
    fontSize: parseInt(localStorage.getItem('size')) || 16,
    fontFamily: localStorage.getItem('font') || 'sans',
    showLinkTypes: localStorage.getItem('linkTypes') === 'true',
    textAlign: localStorage.getItem('textAlign') || 'left',
    isDirty: false,
    showSettings: false,
    showTOC: false,
    showRecents: false,
    splitWidth: 50,
    assetMap: new Map(),
    fileHandle: null,
    mainFileFound: false,
    version: '1.0.31',
    updateWaiting: false,
    isSync: false,
    fmPrefs: JSON.parse(localStorage.getItem('fmPrefs')) || { title: true, description: true, author: true, date: true, tags: true },
    recentFiles: JSON.parse(localStorage.getItem('recentFiles')) || []
};

// UI tarafinin doldurdugu paylasilan DOM referanslari (bkz. markitdown-ui.js -> DOMContentLoaded)
let editor, preview, editorContainer, resizer;

// Paylasilan yardimci: HTML ozel karakterlerini kacir
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// --- IndexedDB: dosya handle kalicilik katmani ---
const dbName = 'MarkItDownDB';
const storeName = 'fileHandles';
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
};

const saveHandle = async (name, handle) => {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(handle, name);
};

const getHandle = async (name) => {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readonly');
    return new Promise((resolve) => {
        const request = tx.objectStore(storeName).get(name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
    });
};

const deleteHandle = async (name) => {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(name);
};

const addToRecents = async (name, handle) => {
    if (!handle && (name === 'Opening.md' || name === 'Untitled.md')) return;
    const newRecents = state.recentFiles.filter(f => f !== name);
    newRecents.unshift(name);
    state.recentFiles = newRecents.slice(0, 10);
    localStorage.setItem('recentFiles', JSON.stringify(state.recentFiles));
    if (handle) await saveHandle(name, handle);
    updateUI();
};

// --- Asset / blob URL yonetimi (goruntu isleme) ---
window.loadLocalFile = async (name) => {
    const lowerName = name.toLowerCase();
    const fileNameOnly = name.split('/').pop().toLowerCase();
    let blobUrl = null;
    for (let [key, val] of state.assetMap) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === lowerName || lowerKey === fileNameOnly || lowerKey.endsWith('/' + lowerName)) {
            blobUrl = val;
            break;
        }
    }
    try {
        const target = blobUrl || name;
        const res = await fetch(target);
        if (res.ok) {
            state.md = await res.text();
            state.fileName = name.split('/').pop();
            if (editor) editor.value = state.md;
            state.isDirty = false;
            state.mode = 'reading';
            updateUI();
        }
    } catch (e) {
        console.error('Error loading file:', e);
    }
};

window.getAsset = (path) => {
    if (!path) return '';
    let p = path.replace(/^\.\//, '');
    if (p.startsWith('http') || p.startsWith('blob:')) return p;
    const decodedP = decodeURIComponent(p);
    const fileName = p.split('/').pop();
    const decodedFileName = decodeURIComponent(fileName);
    for (let [key, val] of state.assetMap) {
        const cleanKey = key.replace(/^\.\//, '');
        if (cleanKey === p || cleanKey === decodedP || key === p || key === decodedP || cleanKey.endsWith('/' + p) || key.endsWith('/' + p) || cleanKey === fileName || cleanKey === decodedFileName || key === fileName || key === decodedFileName) {
            return val;
        }
    }
    return path;
};

window.insertImage = async () => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
    i.onchange = async e => {
        const f = e.target.files[0];
        if (f) {
            const blobUrl = URL.createObjectURL(f);
            state.assetMap.set(f.name, blobUrl);
            window.insertText(`![${f.name}](${f.name})`);
        }
    };
    i.click();
};

// --- Mermaid entegrasyonu ---
async function renderMermaidBlocks() {
    const pending = preview.querySelectorAll('.mermaid-pending');
    if (!pending.length) return;

    const isDark = state.theme === 'dark';
    const isDim = state.theme === 'dim';
    const isLight = state.theme === 'light';

    // CSS degiskenlerinden renkleri al
    const cs = getComputedStyle(document.body);
    const bg = cs.getPropertyValue('--bg').trim();
    const text = cs.getPropertyValue('--text').trim();
    const border = cs.getPropertyValue('--border').trim();
    const accent = cs.getPropertyValue('--accent-color').trim();

    mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        flowchart: { htmlLabels: false, useMaxWidth: true },
        graph: { htmlLabels: false },
        theme: 'base',
        themeVariables: {
            // Genel
            background: bg,
            primaryColor: isDark || isDim ? '#2a2a3a' : '#e8eaf6',
            primaryTextColor: text,
            primaryBorderColor: border,
            lineColor: accent,
            secondaryColor: isDark || isDim ? '#1e1e2e' : '#f0f0f8',
            tertiaryColor: isDark || isDim ? '#181825' : '#eff1f5',

            // Node
            nodeBorder: border,
            clusterBkg: isDark || isDim ? '#1e1e2e' : '#e8eaf6',
            titleColor: accent,

            // Edge label
            edgeLabelBackground: bg,

            // Font
            fontFamily: cs.getPropertyValue('font-family') || 'sans-serif',
            fontSize: '14px',

            // xychart
            xyChart: {
                backgroundColor: bg,
                plotColorPalette: accent,
            }
        }
    });

    for (const el of pending) {
        const code = decodeURIComponent(el.getAttribute('data-code'));
        const id = 'mermaid-' + Math.random().toString(36).slice(2, 9);
        try {
            const { svg } = await mermaid.render(id, code);
            const wrapper = document.createElement('div');
            wrapper.className = 'mermaid-rendered';
            wrapper.innerHTML = svg;
            el.replaceWith(wrapper);
        } catch (e) {
            const errBox = document.createElement('pre');
            errBox.style.cssText = 'color:#ff6b6b; font-size:11px; opacity:0.7; padding:1rem; border:1px solid rgba(255,107,107,0.2); border-radius:8px;';
            errBox.textContent = 'Mermaid hata: ' + e.message;
            el.replaceWith(errBox);
        }
    }
}

// --- Markdown parsing (marked.js renderer + parse) ---
function buildMarkedRenderer() {
    const renderer = new marked.Renderer();
    renderer.heading = (arg1, arg2) => {
        const text = typeof arg1 === 'object' ? arg1.text : arg1;
        const level = typeof arg1 === 'object' ? arg1.depth : arg2;
        return `<h${level} id="${String(text).toLowerCase().replace(/[^\w]+/g, '-')}">${text}</h${level}>`;
    };
    renderer.image = (arg1, arg2, arg3) => {
        let href = typeof arg1 === 'object' ? arg1.href : arg1;
        let text = typeof arg1 === 'object' ? arg1.text : arg3;
        if (!href) return '';
        let src = getAsset(href);
        return `<img src="${src}" alt="${text || ''}" />`;
    };
    renderer.link = (arg1, arg2, arg3) => {
        let href = typeof arg1 === 'object' ? arg1.href : arg1;
        let text = typeof arg1 === 'object' ? arg1.text : arg3;
        if (href.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
            let src = getAsset(href);
            return `<img src="${src}" alt="${text || ''}" />`;
        }
        const isAnchor = href.startsWith('#');
        const isMd = href.match(/\.(md|markdown)$/i);
        const isWeb = href.startsWith('http');
        let linkClass = '';
        if (state.showLinkTypes) {
            if (isAnchor) linkClass = 'link-anchor';
            else if (isMd) linkClass = 'link-file';
            else if (isWeb) linkClass = 'link-web';
        }
        if (isAnchor) {
            const targetId = href.substring(1).toLowerCase().replace(/[^\w]+/g, '-');
            return `<a href="${href}" onclick="event.preventDefault(); document.getElementById('${targetId}')?.scrollIntoView({behavior:'smooth'});" class="${linkClass}">${text}</a>`;
        }
        if (isMd) {
            return `<a href="${href}" onclick="event.preventDefault(); loadLocalFile('${href}');" class="${linkClass}">${text}</a>`;
        }
        const target = isWeb ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${href}"${target} class="${linkClass}">${text}</a>`;
    };
    renderer.code = (arg1, lang) => {
        const code = typeof arg1 === 'object' ? arg1.text : arg1;
        const language = typeof arg1 === 'object' ? arg1.lang : lang;
        if (language === 'mermaid') {
            // Ham kodu data attribute'a göm, SVG render etme
            return `<div class="mermaid-pending" data-code="${encodeURIComponent(code)}"></div>`;
        }
        return `<div class="code-block">
                    <div class="code-block-header">
                        <span class="code-block-lang">${escapeHtml(language || 'text')}</span>
                        <button type="button" class="code-copy-btn" onclick="copyCodeBlock(this)">Copy</button>
                    </div>
                    <pre><code class="language-${escapeHtml(language || '')}">${escapeHtml(code)}</code></pre>
                </div>`;
    };
    return renderer;
}

function renderMarkdown(contentToRender) {
    marked.setOptions({ renderer: buildMarkedRenderer() });
    return marked.parse(contentToRender);
}

// --- Dosya G/Ç ---
const isMarkdownFile = (name) => /\.(md|markdown|mdown|mkdn|mdwn|mkd|rmd|text)$/i.test(name);

window.loadFromRecents = async (name) => {
    const handle = await getHandle(name);
    if (handle) {
        try {
            // Browser requires a fresh user gesture for permission request
            if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
                if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') return;
            }
            const file = await handle.getFile();
            state.md = await file.text();
            state.fileName = file.name;
            state.fileHandle = handle;
            if (editor) editor.value = state.md;
            state.isDirty = false;
            state.showRecents = false;
            addToRecents(name, handle);
            updateUI();
        } catch (e) {
            console.error('Error loading recent file:', e);
            if (confirm('Could not access file. It might have been moved or deleted. Remove from recents?')) {
                state.recentFiles = state.recentFiles.filter(f => f !== name);
                localStorage.setItem('recentFiles', JSON.stringify(state.recentFiles));
                await deleteHandle(name);
                updateUI();
            }
        }
    } else {
        if (confirm('File handle is no longer available in this session. Remove from recents?')) {
            state.recentFiles = state.recentFiles.filter(f => f !== name);
            localStorage.setItem('recentFiles', JSON.stringify(state.recentFiles));
            updateUI();
        }
    }
};

window.reopenFile = async () => {
    if (state.fileHandle) {
        try {
            const file = await state.fileHandle.getFile();
            state.md = await file.text();
            state.fileName = file.name;
            if (editor) editor.value = state.md;
            state.isDirty = false;
            updateUI();
        } catch (e) { }
    } else if (state.fileName === 'Opening.md') {
        try {
            const r = await fetch('Opening.md');
            if (r.ok) { state.md = await r.text(); state.fileName = 'Opening.md'; if (editor) editor.value = state.md; state.isDirty = false; updateUI(); }
        } catch (e) { }
    }
};

window.openFile = async () => {
    if (window.showOpenFilePicker) {
        try {
            const handles = await window.showOpenFilePicker({ multiple: true, types: [{ description: 'Markdown Files', accept: { 'text/markdown': ['.md', '.markdown', '.mdown', '.mkdn', '.mdwn', '.mkd', '.rmd', '.text'], 'text/plain': ['.md', '.markdown', '.txt'] } }] });
            state.assetMap.clear(); state.mainFileFound = false;
            let mainMd = null;
            for (const h of handles) {
                const f = await h.getFile(); const blobUrl = URL.createObjectURL(f); state.assetMap.set(f.name, blobUrl);
                if (isMarkdownFile(f.name)) { if (!mainMd || f.name.toLowerCase() === 'readme.md') { mainMd = f; state.fileHandle = h; } }
            }
            if (mainMd) { state.md = await mainMd.text(); state.fileName = mainMd.name; if (editor) editor.value = state.md; state.isDirty = false; state.mode = 'reading'; addToRecents(mainMd.name, state.fileHandle); updateUI(); }
        } catch (e) { }
    } else {
        const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.accept = '.md,.markdown,.mdown,.mkdn,.mdwn,.mkd,.rmd,.text,text/markdown,text/plain';
        i.onchange = async e => {
            const files = Array.from(e.target.files); if (files.length === 0) return;
            state.assetMap.clear(); state.mainFileFound = false;
            let mainMd = null;
            for (const f of files) {
                const blobUrl = URL.createObjectURL(f); state.assetMap.set(f.name, blobUrl);
                if (isMarkdownFile(f.name)) { if (!mainMd || f.name.toLowerCase() === 'readme.md') mainMd = f; }
            }
            if (mainMd) { state.md = await mainMd.text(); state.fileName = mainMd.name; if (editor) editor.value = state.md; state.isDirty = false; state.fileHandle = null; state.mode = 'reading'; addToRecents(mainMd.name, null); updateUI(); }
        }; i.click();
    }
};

window.newFile = () => {
    let fm = '---\n';
    let hasFM = false;
    if (state.fmPrefs.title) { fm += 'title: New File\n'; hasFM = true; }
    if (state.fmPrefs.description) { fm += 'description: \n'; hasFM = true; }
    if (state.fmPrefs.author) { fm += 'author: \n'; hasFM = true; }
    if (state.fmPrefs.date) { fm += `date: ${new Date().toISOString().split('T')[0]}\n`; hasFM = true; }
    if (state.fmPrefs.tags) { fm += 'tags: []\n'; hasFM = true; }
    fm += '---\n\n';

    state.md = (hasFM ? fm : '') + '# New File\n';
    state.fileName = 'Untitled.md';
    state.fileHandle = null;
    state.isDirty = false;
    state.mode = 'editing';
    if (editor) editor.value = state.md;
    updateUI();
};

window.saveFile = async () => {
    if (state.fileHandle) {
        window.triggerSaveEffect();
        try {
            const writable = await state.fileHandle.createWritable();
            await writable.write(state.md);
            await writable.close();
            state.isDirty = false;
            addToRecents(state.fileName, state.fileHandle);
            updateUI();
            return;
        } catch (e) {
            console.error('Save failed, falling back to Save As:', e);
            return window.saveFileAs();
        }
    } else {
        return window.saveFileAs();
    }
};

window.saveFileAs = async () => {
    if (window.showSaveFilePicker) {
        try {
            let suggestedName = state.fileName.split('/').pop();
            if (!suggestedName.toLowerCase().endsWith('.md') && !suggestedName.toLowerCase().endsWith('.markdown')) suggestedName += '.md';
            const h = await window.showSaveFilePicker({ suggestedName: suggestedName, types: [{ description: 'Markdown Files', accept: { 'text/markdown': ['.md', '.markdown'] } }] });
            window.triggerSaveEffect();
            const w = await h.createWritable(); await w.write(state.md); await w.close();
            state.fileName = h.name; state.fileHandle = h; state.isDirty = false; addToRecents(h.name, h); updateUI();
        } catch (e) { }
    } else {
        window.triggerSaveEffect();
        const b = new Blob([state.md], { type: 'text/markdown' }); const a = document.createElement('a');
        let downloadName = state.fileName.split('/').pop();
        if (!downloadName.toLowerCase().endsWith('.md') && !downloadName.toLowerCase().endsWith('.markdown')) downloadName += '.md';
        a.href = URL.createObjectURL(b); a.download = downloadName; a.click(); state.isDirty = false;
        // Note: We can't get a handle from a manual download, so we don't update state.fileHandle
        addToRecents(downloadName, null); updateUI();
    }
};

async function readEntry(entry, path = '') {
    try {
        if (entry.isFile) {
            const file = await new Promise((res, rej) => entry.file(res, rej)); const fullPath = (path + entry.name).replace(/^\//, ''); const blobUrl = URL.createObjectURL(file); state.assetMap.set(fullPath, blobUrl); state.assetMap.set(entry.name, blobUrl);
            if (isMarkdownFile(file.name)) { if (!state.mainFileFound || file.name.toLowerCase() === 'readme.md') { state.md = await file.text(); state.fileName = fullPath; if (editor) editor.value = state.md; state.isDirty = false; state.mainFileFound = true; } }
        } else if (entry.isDirectory) {
            const reader = entry.createReader();
            const readAllEntries = async () => { const entries = await new Promise((res, rej) => reader.readEntries(res, rej)); if (entries.length > 0) { for (const e of entries) await readEntry(e, path + entry.name + '/'); await readAllEntries(); } };
            await readAllEntries();
        }
    } catch (err) { }
}
