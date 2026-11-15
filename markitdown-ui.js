// markitdown-ui.js
// Sorumluluklar: Toolbar bilesenleri, Ayarlar paneli, Tema yonetimi mantigi ve
// preview/DOM render dongusu (updateUI). Markdown parse islemi markitdown-core.js
// icindeki renderMarkdown()'a delege edilir. Bu dosya markitdown-core.js'den SONRA
// yuklenmelidir.

const triggerSaveEffect = () => {
    const r = document.getElementById('root');
    if (r) {
        r.style.boxShadow = "inset 0 -100px 100px -50px var(--accent-color)";
        setTimeout(() => { r.style.boxShadow = "none"; }, 500);
    }
};
window.triggerSaveEffect = triggerSaveEffect;

function updateUI() {
    if (!editor) return;
    const isSplit = state.mode === 'split' || state.mode === 'sync';
    const accent = ACCENTS[state.accentKey];
    const accentHex = state.theme === 'light' ? accent.light : accent.dark;

    document.body.className = `theme-${state.theme} font-${state.fontFamily}`;
    const body = document.body;
    if (state.theme === 'dark') {
        body.style.setProperty('--bg', accent.bgDark);
        body.style.setProperty('--border', accent.borderDark);
        body.style.setProperty('--toolbar', accent.toolbarDark);
        body.style.setProperty('--panel-bg', accent.bgDark);
    } else {
        body.style.removeProperty('--bg');
        body.style.removeProperty('--border');
        body.style.removeProperty('--toolbar');
        body.style.removeProperty('--panel-bg');
    }

    document.getElementById('toolbar').classList.toggle('hidden', state.mode === 'reading');
    editorContainer.classList.toggle('hidden', state.mode === 'reading');
    document.getElementById('preview-container').classList.toggle('hidden', state.mode === 'editing');
    resizer.classList.toggle('hidden', !isSplit);

    if (state.mode === 'editing') editorContainer.style.width = '100%';
    else if (isSplit) editorContainer.style.width = state.splitWidth + '%';

    document.documentElement.style.setProperty('--accent-color', accentHex);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', accentHex);
    document.getElementById('theme-display').innerText = state.theme + ' mode';
    document.getElementById('font-val').innerText = state.fontSize + 'px';
    document.getElementById('align-btn').innerText = state.textAlign === 'justify' ? 'FULL BLOCK' : 'PLAIN';

    let displayTitle = state.fileName;
    let contentToRender = state.md || '';
    let fmMetaHtml = '';
    const fmMatch = contentToRender.match(/^---\n([\s\S]*?)\n---(\n|$)/);
    if (fmMatch) {
        const fm = fmMatch[1];
        const titleMatch = fm.match(/^title:\s*(.*)$/m);
        if (titleMatch) {
            displayTitle = titleMatch[1].trim();
        }
        const grab = (key) => {
            const m = fm.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
            return m ? m[1].trim() : '';
        };
        const author = grab('author');
        const date = grab('date');
        const description = grab('description');
        let tagsRaw = grab('tags');
        const tags = tagsRaw ? tagsRaw.replace(/^\[|\]$/g, '').split(',').map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : [];

        const metaParts = [];
        if (author) metaParts.push(escapeHtml(author));
        if (date) metaParts.push(escapeHtml(date));
        if (tags.length) metaParts.push(tags.map(t => escapeHtml(t)).join(', '));
        let metaLine = metaParts.length ? `<div class="fm-meta-line">${metaParts.join(' &middot; ')}</div>` : '';
        let descLine = description ? `<div class="fm-meta-desc">${escapeHtml(description)}</div>` : '';
        if (metaLine || descLine) fmMetaHtml = `<div class="fm-meta-strip">${descLine}${metaLine}</div>`;

        contentToRender = contentToRender.substring(fmMatch[0].length);
    } else {
        const firstLine = contentToRender.split('\n')[0]?.replace(/#/g, '').trim();
        if (firstLine) displayTitle = firstLine;
    }
    document.title = `mark it down - [${displayTitle}${state.isDirty ? ' *' : ''}]`;
    document.getElementById('file-info').innerText = `[${displayTitle}${state.isDirty ? ' *' : ''}]`;

    document.getElementById('mode-text').innerText = state.isDirty ? 'EDITING' : state.mode.toUpperCase();
    document.getElementById('link-types-btn').innerText = state.showLinkTypes ? 'VISIBLE' : 'ACCENT';
    document.getElementById('version-display').innerText = `v${state.version}`;
    document.getElementById('update-btn').classList.toggle('hidden', !state.updateWaiting);

    document.getElementById('settings-panel').classList.toggle('hidden', !state.showSettings);
    document.getElementById('toc-sidebar').classList.toggle('hidden-panel', !state.showTOC);
    document.getElementById('recents-sidebar').classList.toggle('hidden-panel', !state.showRecents);

    const fa = document.getElementById('footer-actions');
    fa.innerHTML = state.mode === 'reading' ? `<button onclick="setMode('editing')" style="color:var(--accent-color); background:none; border:none; cursor:pointer; font:inherit;">EDIT</button>` : `<button onclick="saveFile()" style="color:var(--accent-color); background:none; border:none; cursor:pointer; font:inherit;">SAVE</button>`;

    document.getElementById('accent-grid').innerHTML = Object.keys(ACCENTS).map(k => `<div onclick="setAccent('${k}')" class="dot ${state.accentKey === k ? 'active' : ''}" style="background:${state.theme === 'light' ? ACCENTS[k].light : ACCENTS[k].dark}"></div>`).join('');
    document.getElementById('fm-prefs-grid').innerHTML = Object.keys(state.fmPrefs).map(k => `<button onclick="toggleFMPref('${k}')" style="background:${state.fmPrefs[k] ? 'var(--accent-color)' : 'rgba(0,0,0,0.1)'}; color:${state.fmPrefs[k] ? 'white' : 'inherit'}; border:none; padding:6px; border-radius:8px; cursor:pointer; font-size:9px; font-weight:900;">${k.toUpperCase()}</button>`).join('');
    document.getElementById('font-family-grid').innerHTML = ['sans', 'serif', 'mono', 'cursive'].map(f => `<button onclick="setFont('${f}')" style="flex:1; background:${state.fontFamily === f ? 'var(--accent-color)' : 'rgba(0,0,0,0.1)'}; color:${state.fontFamily === f ? 'white' : 'inherit'}; border:none; padding:6px; border-radius:8px; cursor:pointer; font-size:9px; font-weight:900;">${f.toUpperCase()}</button>`).join('');

    const scales = { sans: 1.0, serif: 1.0, mono: 1.0, cursive: 1.2 };
    const visualSize = state.fontSize * (scales[state.fontFamily] || 1.0);
    editor.style.fontSize = visualSize + 'px';
    preview.style.fontSize = visualSize + 'px';
    preview.style.textAlign = state.textAlign;
    preview.style.maxWidth = '100%';

    const parsedHtml = renderMarkdown(contentToRender);
    const h1Close = parsedHtml.indexOf('</h1>');
    preview.innerHTML = (h1Close !== -1)
        ? parsedHtml.slice(0, h1Close + 5) + fmMetaHtml + parsedHtml.slice(h1Close + 5)
        : fmMetaHtml + parsedHtml;
    renderMermaidBlocks();


    // Hex Color Visualization
    const hexRegex = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g;
    const walker = document.createTreeWalker(preview, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let n;
    while (n = walker.nextNode()) {
        if (hexRegex.test(n.nodeValue)) textNodes.push(n);
    }
    textNodes.forEach(node => {
        const parent = node.parentNode;
        if (parent.closest("a")) return; // Skip if inside a link
        const span = document.createElement("span");
        span.innerHTML = node.nodeValue.replace(hexRegex, match =>
            `<span class="hex-tag" style="--hex-color:${match}">${match}<span class="hex-swatch"></span></span>`
        );
        parent.replaceChild(span, node);
    });

    const headers = Array.from(new DOMParser().parseFromString(parsedHtml, 'text/html').querySelectorAll('h1, h2, h3'));
    document.getElementById('toc-content').innerHTML = headers.length ? headers.map(h => `<button onclick="document.getElementById('${String(h.innerText).toLowerCase().replace(/[^\w]+/g, '-')}').scrollIntoView({behavior:'smooth'});" class="toc-btn" style="padding-left:${h.tagName === 'H1' ? '0' : h.tagName === 'H2' ? '12px' : '24px'}">${h.innerText}</button>`).join('') : '<div style="font-size:10px; opacity:0.3;">No headers found</div>';

    document.getElementById('recents-content').innerHTML = state.recentFiles.length ? state.recentFiles.map(f => `<button onclick="loadFromRecents('${f}')" class="toc-btn">${f}</button>`).join('') : '<div style="font-size:10px; opacity:0.3;">No recent files</div>';

    ['editing', 'split', 'reading'].forEach(m => { const b = document.getElementById('btn-' + m); if (b) b.classList.toggle('active', state.mode === m); });
    const sBtn = document.getElementById('btn-sync');
    if (sBtn) {
        sBtn.classList.toggle('active', state.isSync);
        sBtn.style.opacity = state.mode === 'split' ? '1' : '0.3';
    }
}

window.toggleFMPref = (k) => {
    state.fmPrefs[k] = !state.fmPrefs[k];
    localStorage.setItem('fmPrefs', JSON.stringify(state.fmPrefs));
    updateUI();
};

window.setMode = m => {
    if (m === 'sync') {
        state.isSync = !state.isSync;
        if (state.isSync) state.mode = 'split';
    } else {
        state.mode = m;
        if (m !== 'split') state.isSync = false;
    }
    updateUI();
};
window.setAccent = k => { state.accentKey = k; localStorage.setItem('accentKey', k); updateUI(); };
window.setFont = f => { state.fontFamily = f; localStorage.setItem('font', f); updateUI(); };
window.changeFontSize = d => { state.fontSize = Math.max(12, Math.min(32, state.fontSize + d)); localStorage.setItem('size', state.fontSize); updateUI(); };
window.cycleTheme = () => { const t = ['light', 'dim', 'dark']; state.theme = t[(t.indexOf(state.theme) + 1) % 3]; localStorage.setItem('theme', state.theme); updateUI(); };
window.toggleSettings = () => { state.showSettings = !state.showSettings; if (state.showSettings) { state.showTOC = false; state.showRecents = false; } updateUI(); };
window.toggleTOC = () => { state.showTOC = !state.showTOC; if (state.showTOC) { state.showSettings = false; state.showRecents = false; } updateUI(); };
window.toggleRecents = () => { state.showRecents = !state.showRecents; if (state.showRecents) { state.showSettings = false; state.showTOC = false; } updateUI(); };
window.clearRecents = async () => { if (confirm('Clear recent files list?')) { for (const f of state.recentFiles) await deleteHandle(f); state.recentFiles = []; localStorage.setItem('recentFiles', JSON.stringify([])); updateUI(); } };

window.checkForUpdates = async () => {
    const el = document.getElementById('version-display');
    const originalText = `v${state.version}`;
    el.innerText = 'CHECKING...';
    el.style.opacity = '1';
    try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
            await reg.update();
        }
    } catch (e) { console.error('Update check failed:', e); }
    setTimeout(() => {
        el.innerText = originalText;
        el.style.opacity = '0.3';
    }, 1000);
};

window.copyCodeBlock = async (btn) => {
    const code = btn.closest('.code-block')?.querySelector('pre code');
    if (!code) return;
    const text = code.textContent;
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        btn.textContent = 'Copied';
        btn.classList.add('copied');
    } catch (err) {
        btn.textContent = 'Error';
    }
    clearTimeout(btn._copyTimeout);
    btn._copyTimeout = setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
};
window.toggleLinkTypes = () => { state.showLinkTypes = !state.showLinkTypes; localStorage.setItem('linkTypes', state.showLinkTypes); updateUI(); };
window.toggleTextAlign = () => { state.textAlign = state.textAlign === 'left' ? 'justify' : 'left'; localStorage.setItem('textAlign', state.textAlign); updateUI(); };
window.resetSettings = () => { if (confirm('Reset all settings to default?')) { localStorage.clear(); location.reload(); } };
window.updateApp = () => {
    navigator.serviceWorker.getRegistration().then(reg => {
        if (reg && reg.waiting) {
            reg.waiting.postMessage('skipWaiting');
        } else {
            window.location.reload();
        }
    });
};
window.insertText = (b, a = '') => { if (!editor) return; const s = editor.selectionStart, e = editor.selectionEnd; state.md = state.md.substring(0, s) + b + state.md.substring(s, e) + a + state.md.substring(e); editor.value = state.md; state.isDirty = true; updateUI(); };

window.insertTable = () => insertText('\n| Col 1 | Col 2 |\n| --- | --- |\n| Item 1 | Item 2 |');

window.addEventListener('DOMContentLoaded', () => {
    editor = document.getElementById('editor'); preview = document.getElementById('preview'); editorContainer = document.getElementById('editor-container'); resizer = document.getElementById('resizer');
    if (editor) {
        editor.oninput = () => { state.md = editor.value; state.isDirty = true; updateUI(); };
        editor.addEventListener('keydown', e => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = editor.selectionStart;
                const end = editor.selectionEnd;
                const val = editor.value;
                editor.value = val.substring(0, start) + '    ' + val.substring(end);
                editor.selectionStart = editor.selectionEnd = start + 4;
                state.md = editor.value;
                state.isDirty = true;
                updateUI();
            }
        });
    }
    let isResizing = false;
    resizer.addEventListener('mousedown', () => { isResizing = true; document.body.style.cursor = 'col-resize'; resizer.classList.add('resizing'); });
    window.addEventListener('mousemove', e => { if (!isResizing) return; const w = (e.clientX / window.innerWidth) * 100; if (w > 20 && w < 80) { state.splitWidth = w; editorContainer.style.width = w + '%'; } });
    window.addEventListener('mouseup', () => { isResizing = false; document.body.style.cursor = 'default'; resizer.classList.remove('resizing'); });

    // Sync Scroll logic
    const previewContainer = document.getElementById('preview-container');
    let isSyncingEditor = false;
    let isSyncingPreview = false;

    editor.addEventListener('scroll', () => {
        if (!state.isSync || isSyncingEditor) { isSyncingEditor = false; return; }
        isSyncingPreview = true;
        const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
        previewContainer.scrollTop = percentage * (previewContainer.scrollHeight - previewContainer.clientHeight);
    });

    previewContainer.addEventListener('scroll', () => {
        if (!state.isSync || isSyncingPreview) { isSyncingPreview = false; return; }
        isSyncingEditor = true;
        const percentage = previewContainer.scrollTop / (previewContainer.scrollHeight - previewContainer.clientHeight);
        editor.scrollTop = percentage * (editor.scrollHeight - editor.clientHeight);
    });

    editor.addEventListener('paste', async e => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                const blobUrl = URL.createObjectURL(file);
                const fileName = `pasted-image-${Date.now()}.png`;
                state.assetMap.set(fileName, blobUrl);
                window.insertText(`![${fileName}](${fileName})`);
                e.preventDefault();
            }
        }
    });

    window.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); document.getElementById('root').style.boxShadow = "inset 0 -100px 100px -50px var(--accent-color)"; });
    window.addEventListener('dragenter', e => { e.preventDefault(); e.stopPropagation(); });
    window.addEventListener('dragleave', () => document.getElementById('root').style.boxShadow = "none");
    window.addEventListener('drop', async e => {
        e.preventDefault(); e.stopPropagation(); document.getElementById('root').style.boxShadow = "none";
        const items = e.dataTransfer.items ? Array.from(e.dataTransfer.items) : [];
        const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];

        // Determine if we should clear or append
        const hasMd = files.some(f => isMarkdownFile(f.name));
        if (hasMd) {
            state.assetMap.clear();
            state.mainFileFound = false;
            state.fileHandle = null;
        }

        for (const item of items) { if (item.kind === 'file' && item.getAsFileSystemHandle) { try { const handle = await item.getAsFileSystemHandle(); if (handle && handle.kind === 'file' && isMarkdownFile(handle.name)) { if (!state.fileHandle || handle.name.toLowerCase() === 'readme.md') state.fileHandle = handle; } } catch (err) { } } }
        if (items.length > 0 && items[0].webkitGetAsEntry) { for (const item of items) { const entry = item.webkitGetAsEntry(); if (entry) await readEntry(entry); } }

        if (files.length > 0) {
            for (const f of files) {
                const blobUrl = URL.createObjectURL(f);
                state.assetMap.set(f.name, blobUrl);
                if (isMarkdownFile(f.name)) {
                    if (!state.mainFileFound || f.name.toLowerCase() === 'readme.md') {
                        try {
                            state.md = await f.text(); state.fileName = f.name; if (editor) editor.value = state.md; state.isDirty = false; state.mainFileFound = true;
                        } catch (err) { }
                    }
                } else if (f.type.startsWith('image/') && !hasMd) {
                    // If dropping just images, insert them at cursor
                    window.insertText(`![${f.name}](${f.name})`);
                }
            }
        }
        if (state.mainFileFound) state.mode = 'reading'; updateUI();
    });
    window.addEventListener('keydown', e => {
        const isCmd = e.metaKey || e.ctrlKey;
        if (isCmd && e.key === 'Enter') { e.preventDefault(); setMode(state.mode === 'reading' ? 'editing' : 'reading'); }
        if (isCmd && !e.shiftKey && e.key === 's') { e.preventDefault(); saveFile(); }
        if (isCmd && e.shiftKey && e.key === 's') { e.preventDefault(); saveFileAs(); }
        if (isCmd && e.key === 'o') { e.preventDefault(); openFile(); }
        if (isCmd && e.key === 'r') { e.preventDefault(); reopenFile(); }
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').then(reg => {
                reg.onupdatefound = () => {
                    const installingWorker = reg.installing;
                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            state.updateWaiting = true;
                            updateUI();
                        }
                    };
                };
                if (reg.waiting) {
                    state.updateWaiting = true;
                    updateUI();
                }
            }).catch(err => console.log('SW registration failed:', err));
        });

        let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
    }

    const loadOpeningFile = async () => {
        if (state.mainFileFound) return;
        try {
            const r = await fetch('Opening.md');
            if (r.ok && !state.mainFileFound) {
                state.md = await r.text();
                if (editor) editor.value = state.md;
                updateUI();
            }
        } catch (e) {
            if (!state.mainFileFound) {
                state.md = '# mark it down';
                if (editor) editor.value = state.md;
                updateUI();
            }
        }
    };

    if ('launchQueue' in window) {
        window.launchQueue.setConsumer(async (launchParams) => {
            if (launchParams.files && launchParams.files.length) {
                state.assetMap.clear(); state.mainFileFound = false;
                for (const handle of launchParams.files) {
                    const file = await handle.getFile();
                    const blobUrl = URL.createObjectURL(file);
                    state.assetMap.set(file.name, blobUrl);
                    const isMd = isMarkdownFile(file.name);
                    const isTxt = file.name.endsWith('.txt');
                    if (isMd || isTxt) {
                        if (!state.mainFileFound || file.name.toLowerCase() === 'readme.md') {
                            state.md = await file.text();
                            state.fileName = file.name;
                            state.fileHandle = handle;
                            if (editor) editor.value = state.md;
                            state.isDirty = false;
                            state.mainFileFound = true;
                        }
                    }
                }
                if (state.mainFileFound) state.mode = 'reading';
                else await loadOpeningFile();
                updateUI();
            } else {
                await loadOpeningFile();
            }
        });
    } else {
        loadOpeningFile();
    }
});
