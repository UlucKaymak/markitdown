import { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import "./index.css";
import { 
  Bold, Italic, List, Code, Link as LinkIcon, 
  Indent, Edit3, Columns2, Eye,
  Minus, Plus, Table
} from 'lucide-react';
// Tauri Plugins
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { openUrl } from '@tauri-apps/plugin-opener';

type Theme = "dark" | "light";
type ViewMode = "edit" | "split" | "sync" | "preview";

const colors: Record<string, any> = {
  blue: { text: 'text-[#89b4fa]', lightText: 'text-[#1e66f5]', hex: '#89b4fa', lightHex: '#1e66f5' },
  green: { text: 'text-[#a6e3a1]', lightText: 'text-[#40a02b]', hex: '#a6e3a1', lightHex: '#40a02b' },
  purple: { text: 'text-[#cba6f7]', lightText: 'text-[#8839ef]', hex: '#cba6f7', lightHex: '#8839ef' },
  red: { text: 'text-[#f2cdcd]', lightText: 'text-[#dd7878]', hex: '#f2cdcd', lightHex: '#dd7878' }
};

const isTauri = () => !!(window as any).__TAURI_INTERNALS__;

function App() {
  const [markdown, setMarkdown] = useState("# Mark It Down\n\n**Mark It Down** is a Markdown reader and editor designed to keep you focused on your text and thoughts.\n\n[Markdown Writing Guide](/MarkdownGuide.md) - Learn the basic syntax here.");

  // Load settings from localStorage
  const savedSettings = JSON.parse(localStorage.getItem('markitdown-settings') || '{}');

  const [theme, setTheme] = useState<Theme>(savedSettings.theme || "light");
  const [accentColor, setAccentColor] = useState(savedSettings.accentColor || "blue");
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [fontSize, setFontSize] = useState(savedSettings.fontSize || 16);
  const [fontFamily, setFontFamily] = useState(savedSettings.fontFamily || "sans");
  const [fileName, setFileName] = useState("Opening.md");
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showStats, setShowStats] = useState(savedSettings.showStats ?? false);
  const [showTOC, setShowTOC] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const currentColors = colors[accentColor] || colors.blue;

  // Scroll synchronization
  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    if (viewMode !== 'sync') return;
    if (isScrolling.current) {
      isScrolling.current = false;
      return;
    }

    const source = e.currentTarget;
    const target = source === textareaRef.current ? previewRef.current : textareaRef.current;

    if (target) {
      const scrollPercentage = source.scrollTop / (source.scrollHeight - source.clientHeight);
      const newScrollTop = scrollPercentage * (target.scrollHeight - target.clientHeight);
      
      if (Math.abs(target.scrollTop - newScrollTop) > 1) {
        isScrolling.current = true;
        target.scrollTop = newScrollTop;
      }
    }
  };

  // Update window title
  useEffect(() => {
    const title = `mark it down - [${fileName}${isDirty ? ' *' : ''}]`;
    document.title = title;
    
    if (isTauri()) {
      const updateTauriTitle = async () => {
        try {
          const webviewWin = getCurrentWebviewWindow();
          await webviewWin.setTitle(title);
        } catch (err) {
          console.error("Failed to set Tauri title:", err);
        }
      };
      updateTauriTitle();
    }
  }, [fileName, isDirty]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const settings = { theme, accentColor, fontSize, fontFamily, showStats };
    localStorage.setItem('markitdown-settings', JSON.stringify(settings));
  }, [theme, accentColor, fontSize, fontFamily, showStats]);

  // Extract headers for TOC
  const getToc = () => {
    const lines = markdown.split('\n');
    return lines
      .filter(line => line.startsWith('#'))
      .map(line => {
        const match = line.match(/^(#+)\s+(.*)$/);
        if (!match) return null;
        const level = match[1].length;
        const text = match[2];
        const id = text.toLowerCase().replace(/\s+/g, '-');
        return { level, text, id };
      })
      .filter(item => item !== null) as { level: number; text: string; id: string }[];
  };

  const toc = getToc();
  const isEditing = viewMode !== 'preview';

  // CSS Variable for Accent Color and Theme Sync
  useEffect(() => {
    const hex = theme === 'dark' ? currentColors.hex : currentColors.lightHex;
    document.documentElement.style.setProperty('--accent-color', hex);

    // Theme class for body/html
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#1e1e2e';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#eff1f5';
    }
  }, [accentColor, theme, currentColors]);

  const stats = {
    chars: markdown.length,
    words: markdown.trim().split(/\s+/).filter(Boolean).length,
    lines: markdown.split('\n').length
  };

  const insertText = (before: string, after: string = '') => {
    if (!textareaRef.current) {
      setMarkdown(m => m + before + after);
      return;
    }

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = textareaRef.current.value;
    const beforeText = text.substring(0, start);
    const selectedText = text.substring(start, end);
    const afterText = text.substring(end);

    const newContent = beforeText + before + selectedText + after + afterText;
    setMarkdown(newContent);
    setIsDirty(true);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = start + before.length + selectedText.length + after.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleNewFile = () => {
    if (isDirty && !confirm("You have unsaved changes. Are you sure you want to create a new file?")) {
      return;
    }
    setMarkdown("# New File\n\nStart writing here...");
    setFileName("Untitled.md");
    setCurrentPath(null);
    setIsDirty(false);
    setViewMode('preview');
  };

  const handleSaveFile = async () => {
    if (!isTauri()) return;
    if (!currentPath) {
      return handleSaveAs();
    }
    try {
      await writeTextFile(currentPath, markdown);
      setIsDirty(false);
    } catch (err) {
      console.error("Save failed:", err);
      // Fallback if direct write fails (e.g. permission issues)
      handleSaveAs();
    }
  };

  const handleSaveAs = async () => {
    if (!isTauri()) return;
    try {
      const path = await saveDialog({
        defaultPath: fileName,
        filters: [{ name: 'Markdown', extensions: ['md'] }]
      });
      if (path) {
        await writeTextFile(path, markdown);
        setCurrentPath(path);
        setFileName(path.split(/[/\\]/).pop() || 'Untitled.md');
        setIsDirty(false);
      }
    } catch (err) { console.error("Save As failed:", err); }
  };

  const handleLoadGuide = async () => {
    await loadFile('/MarkdownGuide.md');
    setShowSettings(false);
  };

  const handleOpenFile = async () => {
    if (!isTauri()) {
      alert("Open file is only available in the desktop application.");
      return;
    }
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: 'Markdown', extensions: ['md', 'txt'] }]
      });
      if (selected && typeof selected === 'string') {
        await loadFile(selected);
      }
    } catch (err) { console.error("Open failed:", err); }
  };

  const loadFile = async (path: string) => {
    try {
      let content = "";
      try {
        if (isTauri()) {
          content = await readTextFile(path);
        } else {
          throw new Error("Not in Tauri");
        }
      } catch (err) {
        if (path.startsWith('/')) {
          const response = await fetch(path);
          if (response.ok) {
            content = await response.text();
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }

      setMarkdown(content);
      setFileName(path.split(/[/\\]/).pop() || 'Untitled.md');
      // Sadece gerçek disk yolları için currentPath set et. 
      // / ile başlayan ama diskte olmayanları (asset) null tut.
      if (isTauri()) {
        if (path.startsWith('/') && !path.includes(':')) {
          try { await readTextFile(path); setCurrentPath(path); }
          catch { setCurrentPath(null); }
        } else {
          setCurrentPath(path);
        }
      }

      setIsDirty(false);
      setViewMode('preview');
    } catch (err) { console.error("Failed to load file:", err); }
  };

  // Start-up: URL'den dosya yükle
  useEffect(() => {
    if (!isTauri()) return;
    
    const params = new URLSearchParams(window.location.search);
    const fileToLoad = params.get('file');
    if (fileToLoad) {
      loadFile(fileToLoad);
    }
  }, []);

  const handleLinkClick = async (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, href: string) => {
    e.preventDefault();
    if (href.startsWith('#')) {
      const element = document.getElementById(href.slice(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    if (href.startsWith('http')) {
      if (isTauri()) {
        await openUrl(href);
      } else {
        window.open(href, '_blank');
      }
      return;
    }

    if (href.endsWith('.md') || href.endsWith('.txt')) {
      let targetPath = href;
      if (currentPath && !href.startsWith('/') && !href.includes(':')) {
        const lastSlash = Math.max(currentPath.lastIndexOf('/'), currentPath.lastIndexOf('\\'));
        if (lastSlash !== -1) {
          targetPath = currentPath.substring(0, lastSlash + 1) + href;
        }
      }
      await loadFile(targetPath);
      return;
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (isCmd && key === 'n') { e.preventDefault(); handleNewFile(); }
      if (isCmd && !e.shiftKey && key === 's') { e.preventDefault(); handleSaveFile(); }
      if (isCmd && e.shiftKey && key === 's') { e.preventDefault(); handleSaveAs(); }
      if (isCmd && key === 'o') { e.preventDefault(); handleOpenFile(); }
      if (isCmd && key === 'r') { window.location.reload(); }
      
      if (isEditing && isCmd) {
        if (key === 'b') { e.preventDefault(); insertText('**', '**'); }
        if (key === 'i') { e.preventDefault(); insertText('_', '_'); }
        if (key === '1') { e.preventDefault(); insertText('# '); }
        if (key === '2') { e.preventDefault(); insertText('## '); }
        if (key === '3') { e.preventDefault(); insertText('### '); }
      }
      
      if (isCmd && e.key === 'Enter') { e.preventDefault(); setViewMode(isEditing ? 'preview' : 'edit'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [markdown, currentPath, viewMode, isDirty, fileName]); // Added dependencies for stability

  // Menu Event Listeners
  useEffect(() => {
    if (!isTauri()) return;

    const unlistenNew = listen('menu-new', () => handleNewFile());
    const unlistenOpen = listen('menu-open', () => handleOpenFile());
    const unlistenSave = listen('menu-save', () => handleSaveFile());
    const unlistenSaveAs = listen('menu-save-as', () => handleSaveAs());

    return () => {
      unlistenNew.then(f => f());
      unlistenOpen.then(f => f());
      unlistenSave.then(f => f());
      unlistenSaveAs.then(f => f());
    };
  }, [markdown, currentPath, isDirty, fileName]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden transition-colors duration-500 bg-[#eff1f5] text-[#4c4f69] dark:bg-[#1e1e2e] dark:text-[#cdd6f4]`}>

      {isEditing && (
        <div className={`border-b px-4 py-2 flex items-center justify-center gap-1 z-30 transition-colors bg-[#e6e9ef] border-[#bac2de] dark:bg-[#181825] dark:border-[#313244]`}>
          <button onClick={() => insertText('**', '**')} className="p-2 hover:bg-slate-500/10 rounded text-slate-500"><Bold size={18} /></button>
          <button onClick={() => insertText('_', '_')} className="p-2 hover:bg-slate-500/10 rounded text-slate-500"><Italic size={18} /></button>
          <div className="w-px h-5 bg-slate-500/10 mx-1"></div>
          <button onClick={() => insertText('# ')} className="p-2 hover:bg-slate-500/10 rounded text-slate-500 font-bold text-xs uppercase">H1</button>
          <button onClick={() => insertText('## ')} className="p-2 hover:bg-slate-500/10 rounded text-slate-500 font-bold text-xs uppercase">H2</button>
          <button onClick={() => insertText('### ')} className="p-2 hover:bg-slate-500/10 rounded text-slate-500 font-bold text-xs uppercase">H3</button>
          <div className="w-px h-5 bg-slate-500/10 mx-1"></div>
          <button onClick={() => insertText('- ')} className="p-2 hover:bg-slate-500/10 rounded text-slate-500"><List size={18} /></button>
          <button onClick={() => insertText('`', '`')} className="p-2 hover:bg-slate-500/10 rounded text-slate-500"><Code size={18} /></button>
          <button onClick={() => insertText('[', '](url)')} className="p-2 hover:bg-slate-500/10 rounded text-slate-500"><LinkIcon size={18} /></button>
          <button onClick={() => insertText('\n| Column 1 | Column 2 |\n| -------- | -------- |\n| Item 1 | Item 2 |\n')} className="p-2 hover:bg-slate-500/10 rounded text-slate-500"><Table size={18} /></button>
          <button onClick={() => insertText('    ')} className="p-2 hover:bg-slate-500/10 rounded text-slate-500"><Indent size={18} /></button>
          <div className="w-px h-5 bg-slate-500/10 mx-2"></div>
          <div className={`flex p-1 rounded-lg ${theme === 'dark' ? 'bg-[#313244]' : 'bg-[#dce0e8]'}`}>
            {[
              { id: 'edit', icon: <Edit3 size={14} /> },
              { id: 'split', icon: <Columns2 size={14} /> },
              { id: 'sync', icon: <LinkIcon size={14} /> },
              { id: 'preview', icon: <Eye size={14} /> }
            ].map(m => (
              <button key={m.id} onClick={() => setViewMode(m.id as ViewMode)} className={`px-2 py-1 rounded transition-all ${viewMode === m.id ? (theme === 'dark' ? 'bg-[#45475a] text-white' : 'bg-white shadow-sm ' + currentColors.lightText) : 'text-slate-400 hover:text-slate-600'}`}>{m.icon}</button>
            ))}
          </div>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden relative">
        {(viewMode === 'edit' || viewMode === 'split' || viewMode === 'sync') && (
          <div className={`${(viewMode === 'split' || viewMode === 'sync') ? 'w-1/2' : 'flex-1'} ${viewMode !== 'edit' ? 'border-r border-slate-500/10' : ''} flex justify-center`}>
            <textarea
              ref={textareaRef}
              className={`w-full h-full p-10 resize-none outline-none bg-transparent font-${fontFamily} leading-relaxed selection:bg-slate-500/10 ${viewMode !== 'edit' ? 'max-w-[720px]' : ''}`}
              style={{ fontSize: `${fontSize}px` }}
              value={markdown}
              onChange={(e) => { setMarkdown(e.target.value); setIsDirty(true); }}
              onScroll={handleScroll}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  insertText('    ');
                }
              }}
              spellCheck={false}
              autoFocus
            />
          </div>
        )}

        {(viewMode === 'preview' || viewMode === 'split' || viewMode === 'sync') && (
          <div 
            ref={previewRef}
            onScroll={handleScroll}
            className={`${(viewMode === 'split' || viewMode === 'sync') ? 'w-1/2' : 'flex-1'} overflow-y-auto p-10`}
          >
            <div className={`max-w-[720px] mx-auto markdown-body font-${fontFamily}`} style={{ fontSize: `${fontSize}px` }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} onClick={(e) => handleLinkClick(e, props.href || '')} />
                  ),
                  h1: ({ children }) => <h1 id={children?.toString().toLowerCase().replace(/\s+/g, '-')}>{children}</h1>,
                  h2: ({ children }) => <h2 id={children?.toString().toLowerCase().replace(/\s+/g, '-')}>{children}</h2>,
                  h3: ({ children }) => <h3 id={children?.toString().toLowerCase().replace(/\s+/g, '-')}>{children}</h3>,
                }}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {showSettings && (
          <div className={`fixed bottom-12 right-4 w-72 border p-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 shadow-xl rounded-xl ${theme === 'dark' ? 'bg-[#181825] border-[#313244] text-[#cdd6f4]' : 'bg-[#eff1f5] border-[#dce0e8] text-[#4c4f69]'}`}>
            <div className="flex items-center justify-between mb-3 border-b border-slate-500/10 pb-2">
              <h3 className="text-[10px] font-bold tracking-widest uppercase opacity-40">Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-[10px] font-bold tracking-widest uppercase hover:text-red-500 transition-colors">Close</button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-50">Theme</span>
                <button 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
                  className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded transition-all ${theme === 'dark' ? 'bg-[#313244]' : 'bg-[#dce0e8]'} ${theme === 'dark' ? currentColors.text : currentColors.lightText}`}
                >
                  {theme.toUpperCase()} MODE
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-50">Accent</span>
                <div className="flex gap-1.5">
                  {Object.keys(colors).map(c => (
                    <button key={c} onClick={() => setAccentColor(c)} className={`w-3.5 h-3.5 rounded-full transition-transform active:scale-90 ${accentColor === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'opacity-40'}`} style={{ backgroundColor: theme === 'dark' ? colors[c].hex : colors[c].lightHex }} />
                  ))}
                </div>
              </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold tracking-widest uppercase opacity-50">Font Size</span>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => setFontSize(Math.max(12, fontSize - 1))}
                                  className={`p-1 rounded transition-all ${theme === 'dark' ? 'hover:bg-[#313244] text-[#cdd6f4]' : 'hover:bg-[#dce0e8] text-[#4c4f69]'} active:scale-90`}
                                >
                                  <Minus size={14} strokeWidth={3} />
                                </button>
                                <span className="text-[10px] font-bold opacity-40 w-8 text-center">{fontSize}px</span>
                                <button 
                                  onClick={() => setFontSize(Math.min(32, fontSize + 1))}
                                  className={`p-1 rounded transition-all ${theme === 'dark' ? 'hover:bg-[#313244] text-[#cdd6f4]' : 'hover:bg-[#dce0e8] text-[#4c4f69]'} active:scale-90`}
                                >
                                  <Plus size={14} strokeWidth={3} />
                                </button>
                              </div>
                            </div>              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-50">Typography</span>
                <div className="flex gap-3">
                  {['sans', 'serif', 'mono'].map(f => (
                    <button key={f} onClick={() => setFontFamily(f)} className={`text-[10px] font-bold tracking-widest uppercase transition-all ${fontFamily === f ? (theme === 'dark' ? currentColors.text : currentColors.lightText) : 'opacity-30 hover:opacity-100'}`}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-50">Document Stats</span>
                <button onClick={() => setShowStats(!showStats)} className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded transition-all ${showStats ? (theme === 'dark' ? currentColors.text : currentColors.lightText) : 'opacity-30 hover:opacity-100'}`}>{showStats ? 'SHOW' : 'HIDE'}</button>
              </div>
              <div className="!mt-2 border-t border-slate-500/10">
                <div className="py-2 text-center">
                  <button onClick={handleLoadGuide} className="text-[10px] font-bold tracking-widest uppercase transition-all opacity-40 hover:opacity-100 hover:text-blue-500">Load Markdown Guide</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TOC Sidebar with Fade Animation */}
        <div
          className={`fixed right-0 top-0 bottom-0 w-64 p-8 pt-20 border-l z-40 transition-all duration-300 transform shadow-2xl overflow-y-auto
            ${showTOC ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 pointer-events-none'}
            ${theme === 'dark' ? 'bg-[#1e1e2e]/95 border-[#313244] text-[#cdd6f4]' : 'bg-[#eff1f5]/95 border-[#dce0e8] text-[#4c4f69]'}`}
        >
          <div className="space-y-1">
            {toc.length > 0 ? ( 
              toc.map((item, idx) => (
                <button
                  key={idx}
                  onClick={(e) => handleLinkClick(e as any, `#${item.id}`)}
                  className={`block w-full text-left py-1.5 hover:translate-x-1 transition-all text-xs opacity-60 hover:opacity-100 truncate
                    ${item.level === 1 ? 'font-bold' : ''}`}
                  style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                >
                  {item.text}
                </button>
              ))
            ) : (
              <p className="text-[10px] opacity-30 italic">No headers found</p>
            )}
          </div>
        </div>
      </main>

      <footer className={`border-t px-4 py-1 flex items-center justify-between z-50 transition-colors bg-[#dce0e8] border-[#bac2de] text-[#6c6f85] dark:bg-[#11111b] dark:border-[#313244] dark:text-[#bac2de]`}>
        <div className="flex-1 flex items-center gap-4 text-[9px] font-bold tracking-widest uppercase">
          <span className={theme === 'dark' ? currentColors.text : currentColors.lightText}>{isEditing ? 'EDITING' : 'READING'}</span>
          <button onClick={handleOpenFile} className="text-[9px] font-bold tracking-widest uppercase opacity-60 hover:opacity-100">OPEN</button>
          {showStats && <div className="flex gap-3 opacity-40 text-[9px]"><span>C:{stats.chars}</span><span>W:{stats.words}</span><span>L:{stats.lines}</span></div>}
        </div>
        <div className="flex-1 flex justify-center overflow-hidden">
          <span className="text-[9px] font-bold tracking-widest uppercase opacity-40 truncate px-4">[{fileName}{isDirty ? ' *' : ''}]</span>
        </div>
        <div className="flex-1 flex items-center justify-end gap-3">
          <button onClick={() => setShowTOC(!showTOC)} className={`text-[9px] font-bold tracking-widest uppercase transition-all hover:opacity-100 ${showTOC ? (theme === 'dark' ? currentColors.text : currentColors.lightText) : 'opacity-60'}`}>TOC</button>
          <button onClick={() => setShowSettings(!showSettings)} className={`text-[9px] font-bold tracking-widest uppercase transition-all hover:opacity-100 ${showSettings ? (theme === 'dark' ? currentColors.text : currentColors.lightText) : 'opacity-60'}`}>SETTINGS</button>
          <div className="flex items-center gap-3 ml-2">
            {!isEditing ? (
              <button onClick={() => setViewMode('edit')} className={`text-[9px] font-bold tracking-widest uppercase transition-all ${theme === 'dark' ? currentColors.text : currentColors.lightText} hover:opacity-70`}>EDIT</button>
            ) : (
              <>
                <button onClick={handleSaveFile} className={`text-[9px] font-bold tracking-widest uppercase hover:opacity-70 ${theme === 'dark' ? currentColors.text : currentColors.lightText}`}>SAVE</button>
                <button onClick={handleSaveAs} className="text-[9px] font-bold tracking-widest uppercase opacity-60 hover:opacity-100 transition-colors">SAVE AS</button>
                <button onClick={() => setViewMode('preview')} className="text-[9px] font-bold tracking-widest uppercase opacity-60 hover:text-red-500 transition-colors">DON'T SAVE</button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
