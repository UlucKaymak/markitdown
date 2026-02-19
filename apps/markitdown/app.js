// Constants
const OPENING_CONTENT = `# Mark It Down

Mark It Down is a Markdown reader and editor designed to keep you away from clutter, allowing you to focus solely on your text and thoughts.

You can find the Markdown guide in the settings menu.`;
const MARKDOWN_GUIDE_CONTENT = `# Markdown: Syntax

*   [Overview](#overview)
    *   [Philosophy](#philosophy)
...
(Rest of the guide content)`;

// State
let state = {
    markdown: localStorage.getItem('md-content') || OPENING_CONTENT,
    isEditing: false,
    viewMode: 'sync',
    showSettings: false,
    fileName: 'Mark It Down',
    theme: localStorage.getItem('md-theme') || 'light',
    accentColor: localStorage.getItem('md-accent') || 'blue',
    fontFamily: localStorage.getItem('md-font') || 'sans',
    fontSize: parseInt(localStorage.getItem('md-font-size')) || 18,
    showStats: localStorage.getItem('md-show-char') === 'true'
};

// DOM Elements
const elements = {
    app: document.getElementById('app'),
    toolbar: document.getElementById('toolbar'),
    textarea: document.getElementById('markdown-input'),
    preview: document.getElementById('preview-pane'),
    editPane: document.getElementById('edit-pane'),
    settingsPanel: document.getElementById('settings-panel'),
    modeStatus: document.getElementById('mode-status'),
    filenameDisplay: document.getElementById('filename-display'),
    editToggleBtn: document.getElementById('edit-toggle-btn'),
    editActions: document.getElementById('edit-actions'),
    charCount: document.getElementById('char-count'),
    lineCount: document.getElementById('line-count'),
    statsDisplay: document.getElementById('stats-display'),
    fontSizeVal: document.getElementById('font-size-val')
};

// Initialize
function init() {
    lucide.createIcons();
    updateUI();
    renderMarkdown();
    setupEventListeners();
}

function updateUI() {
    // Theme & Accent
    elements.app.className = state.theme;
    elements.app.style.setProperty('--current-accent', `var(--accent-${state.accentColor}${state.theme === 'dark' ? '-dark' : ''})`);
    
    // Modes
    elements.toolbar.classList.toggle('hidden', !state.isEditing);
    elements.modeStatus.textContent = state.isEditing ? 'EDITING' : 'READING';
    elements.editToggleBtn.classList.toggle('hidden', state.isEditing);
    elements.editActions.classList.toggle('hidden', !state.isEditing);
    
    // View Modes
    const isSplit = state.viewMode === 'split' || state.viewMode === 'sync';
    elements.editPane.classList.toggle('hidden', state.viewMode === 'preview');
    elements.preview.classList.toggle('hidden', state.viewMode === 'edit');
    
    // Typography
    elements.preview.style.fontFamily = `var(--font-${state.fontFamily})`;
    elements.preview.querySelectorAll('p').forEach(p => p.style.fontSize = `${state.fontSize}px`);
    elements.textarea.style.fontSize = `${state.fontSize}px`;
    elements.fontSizeVal.textContent = state.fontSize;
    
    // Stats
    elements.statsDisplay.classList.toggle('hidden', !state.showStats);
    updateStats();
    
    elements.filenameDisplay.textContent = `[${state.fileName}]`;
    elements.textarea.value = state.markdown;
}

function renderMarkdown() {
    elements.preview.innerHTML = marked.parse(state.markdown);
}

function updateStats() {
    elements.charCount.textContent = state.markdown.length;
    elements.lineCount.textContent = state.markdown.split('
').length;
}

function setupEventListeners() {
    // Input
    elements.textarea.addEventListener('input', (e) => {
        state.markdown = e.target.value;
        localStorage.setItem('md-content', state.markdown);
        renderMarkdown();
        updateStats();
    });

    // Toolbar Actions
    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            handleToolbarAction(action);
        });
    });

    // View Modes
    document.querySelectorAll('[data-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            state.viewMode = btn.dataset.mode;
            document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateUI();
        });
    });

    // Settings
    document.getElementById('settings-btn').addEventListener('click', () => {
        state.showSettings = true;
        elements.settingsPanel.classList.remove('hidden');
    });

    document.getElementById('close-settings').addEventListener('click', () => {
        state.showSettings = false;
        elements.settingsPanel.classList.add('hidden');
    });

    document.getElementById('theme-toggle').addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('md-theme', state.theme);
        updateUI();
    });

    // Font Size
    document.getElementById('size-up').addEventListener('click', () => {
        state.fontSize = Math.min(32, state.fontSize + 1);
        localStorage.setItem('md-font-size', state.fontSize);
        updateUI();
    });

    document.getElementById('size-down').addEventListener('click', () => {
        state.fontSize = Math.max(12, state.fontSize - 1);
        localStorage.setItem('md-font-size', state.fontSize);
        updateUI();
    });

    // Edit Toggle
    elements.editToggleBtn.addEventListener('click', () => {
        state.isEditing = true;
        updateUI();
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
        state.isEditing = false;
        updateUI();
    });

    // Sync Scroll
    elements.textarea.addEventListener('scroll', () => {
        if (state.viewMode === 'sync') {
            const percentage = elements.textarea.scrollTop / (elements.textarea.scrollHeight - elements.textarea.clientHeight);
            elements.preview.scrollTop = percentage * (elements.preview.scrollHeight - elements.preview.clientHeight);
        }
    });
}

function handleToolbarAction(action) {
    const start = elements.textarea.selectionStart;
    const end = elements.textarea.selectionEnd;
    const text = state.markdown;
    let before = '', after = '';

    switch(action) {
        case 'bold': before = '**'; after = '**'; break;
        case 'italic': before = '_'; after = '_'; break;
        case 'h1': before = '# '; break;
        case 'h2': before = '## '; break;
        case 'link': before = '['; after = '](url)'; break;
        case 'image': before = '!['; after = '](url)'; break;
    }

    const newText = text.substring(0, start) + before + text.substring(start, end) + after + text.substring(end);
    state.markdown = newText;
    elements.textarea.value = newText;
    renderMarkdown();
    elements.textarea.focus();
}

init();
