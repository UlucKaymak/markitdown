document.addEventListener('DOMContentLoaded', () => {
    let chunks = [];
    let currentIndex = 0;
    let intervalId = null;
    let isSpacePressed = false;

    const display = document.getElementById('word-display');
    const progressBar = document.getElementById('progress-bar');
    const input = document.getElementById('text-input');
    const wpmInput = document.getElementById('wpm-input');
    const chunkInput = document.getElementById('chunk-input');
    const themeInput = document.getElementById('theme-input');
    const spaceLogic = document.getElementById('space-logic');
    const alignmentInput = document.getElementById('alignment-input');
    const fontInput = document.getElementById('font-input');
    const fontSizeInput = document.getElementById('font-size-input');
    const highlightColorInput = document.getElementById('highlight-color-input');
    const resetSettingsBtn = document.getElementById('reset-settings-btn');
    const resetTextBtn = document.getElementById('reset-text-btn');
    const installAppBtn = document.getElementById('install-app-btn');
    const installContainer = document.getElementById('install-container');
    const startBtn = document.getElementById('start-btn');
    const rewindBtn = document.getElementById('pause-btn');
    const hintText = document.getElementById('keyboard-hint');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const addTextBtn = document.getElementById('add-text-btn');
    const textInputPanel = document.getElementById('text-input-panel');
    const closeTextBtn = document.getElementById('close-text-btn');
    const pasteBtn = document.getElementById('paste-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');

    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installContainer.style.display = 'flex';
    });

    installAppBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                installContainer.style.display = 'none';
            }
            deferredPrompt = null;
        }
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('SW registered', reg))
                .catch(err => console.log('SW error', err));
        });
    }


    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    async function extractTextFromEpub(arrayBuffer) {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const containerXml = await zip.file("META-INF/container.xml").async("string");
        const parser = new DOMParser();
        const containerDoc = parser.parseFromString(containerXml, "text/xml");
        const opfPath = containerDoc.querySelector("rootfile").getAttribute("full-path");
        const opfXml = await zip.file(opfPath).async("string");
        const opfDoc = parser.parseFromString(opfXml, "text/xml");
        const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";
        const manifestItems = {};
        opfDoc.querySelectorAll("manifest > item").forEach(item => {
            manifestItems[item.getAttribute("id")] = item.getAttribute("href");
        });
        const spineIds = Array.from(opfDoc.querySelectorAll("spine > itemref")).map(item => item.getAttribute("idref"));
        let fullText = "";
        for (const id of spineIds) {
            const href = manifestItems[id];
            const filePath = opfDir + href;
            const fileContent = await zip.file(filePath).async("string");
            const doc = parser.parseFromString(fileContent, "text/html");
            doc.querySelectorAll("script, style").forEach(el => el.remove());
            fullText += doc.body.textContent + "\n";
        }
        return fullText.trim();
    }

    function getTextWidth(text, font) {
        context.font = font;
        return context.measureText(text).width;
    }

    function saveSettings() {
        const settings = {
            wpm: wpmInput.value,
            chunkSize: chunkInput.value,
            theme: themeInput.value,
            spaceLogic: spaceLogic.value,
            alignment: alignmentInput.value,
            font: fontInput.value,
            fontSize: fontSizeInput.value,
            highlightColor: highlightColorInput.value,
        };
        localStorage.setItem('fastReaderSettings', JSON.stringify(settings));
    }

    function applyFontSize(size) {
        display.style.fontSize = `${size}rem`;
    }

    function applyHighlightColor(color) {
        document.documentElement.style.setProperty('--highlight-color', color);
        document.documentElement.style.setProperty('--primary', color);
        const metaThemeColor = document.getElementById('meta-theme-color');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', color);
        }
    }

    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem('fastReaderSettings'));
        if (settings) {
            wpmInput.value = settings.wpm;
            chunkInput.value = settings.chunkSize;
            themeInput.value = settings.theme;
            spaceLogic.value = settings.spaceLogic;
            alignmentInput.value = settings.alignment;
            fontInput.value = settings.font;
            fontSizeInput.value = settings.fontSize || '2.8';
            highlightColorInput.value = settings.highlightColor || '#ff3b30';

            document.documentElement.setAttribute('data-theme', settings.theme);
            document.body.setAttribute('data-font', settings.font);
            applyFontSize(fontSizeInput.value);
            applyHighlightColor(highlightColorInput.value);
        }
    }

    function loadProgress() {
        const savedText = localStorage.getItem('fastReaderText');
        if (savedText) {
            input.value = savedText;
        }

        const savedIndex = localStorage.getItem('fastReaderIndex');
        if (savedIndex !== null) {
            currentIndex = parseInt(savedIndex);
            chunks = getChunks();
            if (chunks.length > 0) {
                if (currentIndex >= chunks.length) {
                    currentIndex = chunks.length;
                    display.textContent = "📕👀⏱️";
                } else if (currentIndex > 0) {
                    displayChunk(currentIndex - 1);
                }
                const progress = (currentIndex / chunks.length) * 100;
                progressBar.style.width = `${progress}%`;
            }
        }
    }

    function initializeSettings() {
        displayRandomHint();
        loadSettings();
        loadProgress();
    }

    const hintMessages = [
        "Having trouble? Reloading the page usually fixes the bugs.",
        "Found a bug? Reloading the page might fix it!",
        "You can always contact me by mail.",

        "Your focus line helps you stay centered while reading.",
        "Press 'Rewind' to go back one or two words and re-read.",

        "The highlight color can be changed in settings to suit your preference.",
        "Adjust WPM and Chunk Size in Settings for a personalized reading experience.",
        "Spacebar behavior can be toggled between 'Play/Pause' and 'Run on Hold' in Settings.",
        "Your settings saves on your browser locally.",

        "You can add this page as an app on nearly every device.",
        "You can add this page as an app on nearly every device.",
        "You can use this app offline.",

        "Made with 🎲 by Uluç Kaymak.",
        "Made with 🎲 by Uluç Kaymak.",
        "Found a bug? Mail me: uluckaymak@gmail.com",
        "Found a bug? Mail me: uluckaymak@gmail.com",
        "Pls buy me a coffee"
    ];

    function displayRandomHint() {
        const randomIndex = Math.floor(Math.random() * hintMessages.length);
        hintText.textContent = hintMessages[randomIndex];
    }

    setInterval(displayRandomHint, 10000);

    themeInput.addEventListener('change', () => {
        document.documentElement.setAttribute('data-theme', themeInput.value);
        applyHighlightColor(highlightColorInput.value);
        saveSettings();
        reset();
    });

    fontInput.addEventListener('change', () => {
        document.body.setAttribute('data-font', fontInput.value);
        saveSettings();
    });

    spaceLogic.addEventListener('change', () => {
        hintText.textContent = spaceLogic.value === 'toggle' ? 'Tap Space to Play/Pause' : 'Hold Space to Read';
        saveSettings();
    });

    wpmInput.addEventListener('change', saveSettings);
    chunkInput.addEventListener('change', saveSettings);
    alignmentInput.addEventListener('change', saveSettings);
    fontSizeInput.addEventListener('change', () => {
        applyFontSize(fontSizeInput.value);
        saveSettings();
    });

    function getChunks() {
        const rawWords = input.value.trim().split(/\s+/);
        const processedWords = rawWords;

        const chunkSize = parseInt(chunkInput.value);
        const result = [];
        let currentChunk = [];

        for (const word of processedWords) {
            currentChunk.push(word);
            const lastChar = word.slice(-1);
            if (currentChunk.length >= chunkSize || lastChar === '.' || lastChar === '!' || lastChar === '?') {
                result.push(currentChunk.join(" "));
                currentChunk = [];
            }
        }

        if (currentChunk.length > 0) {
            result.push(currentChunk.join(" "));
        }
        return result;
    }

    function calculateORP(word) {
        const len = word.length;
        if (len <= 1) return 0;
        if (len <= 4) return 1;
        if (len <= 8) return 2;
        return Math.floor(len / 3);
    }

    function formatWord(word) {
        const orpIndex = calculateORP(word);
        return word.substring(0, orpIndex) +
            `<span class="orp">${word[orpIndex]}</span>` +
            word.substring(orpIndex + 1);
    }

    function updateUI() {
        if (chunks.length > 0) {
            const progress = (currentIndex / chunks.length) * 100;
            progressBar.style.width = `${progress}%`;
            localStorage.setItem('fastReaderIndex', currentIndex);
        }
    }

    function displayChunk(index) {
        if (index < chunks.length) {
            const currentChunk = chunks[index];
            const words = currentChunk.split(' ');
            const targetWordIndex = words.length >= 3 ? 1 : 0;
            const targetWord = words[targetWordIndex];
            const formattedChunk = words.map(formatWord).join(' ');

            display.innerHTML = formattedChunk;

            if (alignmentInput.value === 'center') {
                const font = `${getComputedStyle(display).fontWeight} ${getComputedStyle(display).fontSize} ${getComputedStyle(display).fontFamily}`;
                const widthChunk = getTextWidth(currentChunk, font);

                const orpIndex = calculateORP(targetWord);
                const textBeforeTarget = words.slice(0, targetWordIndex).join(' ') + (targetWordIndex > 0 ? ' ' : '');
                const textBeforeOrp = textBeforeTarget + targetWord.substring(0, orpIndex);
                const orpLetter = targetWord[orpIndex];

                const widthBeforeOrp = getTextWidth(textBeforeOrp, font);
                const orpWidth = getTextWidth(orpLetter, font);
                const offset = (widthChunk / 2) - (widthBeforeOrp + (orpWidth / 2));
                display.style.transform = `translateX(${offset}px)`;
            } else {
                display.style.transform = 'translateX(0)';
            }
        }
    }

    function play() {
        if (intervalId) return;
        chunks = getChunks();
        if (chunks.length === 0 || chunks[0] === "") return;

        const wpm = parseInt(wpmInput.value) || 450;
        const size = parseInt(chunkInput.value);
        const delay = (60000 / wpm) * size;

        startBtn.innerHTML = '<i class="fas fa-pause"></i>Pause';

        displayChunk(currentIndex);
        updateUI();
        currentIndex++;

        intervalId = setInterval(() => {
            if (currentIndex < chunks.length) {
                displayChunk(currentIndex);
                updateUI();
                currentIndex++;
            } else {
                stopReading();
                display.textContent = "The End";
            }
        }, delay);
    }

    function stopReading() {
        clearInterval(intervalId);
        intervalId = null;
        if (currentIndex >= chunks.length && chunks.length > 0) {
            startBtn.innerHTML = '<i class="fas fa-redo"></i>Restart';
        } else {
            startBtn.innerHTML = '<i class="fas fa-play"></i>' + (currentIndex > 0 ? "Continue" : "Start Reading");
        }
        display.style.transform = 'translateX(0)';
    }

    const resetReadingState = () => {
        stopReading();
        currentIndex = 0;
        display.textContent = "VeloRead";
        progressBar.style.width = '0%';
        startBtn.innerHTML = '<i class="fas fa-play"></i>Start Reading';
    };

    function rewind() {
        stopReading();
        currentIndex = Math.max(0, currentIndex - 2);
        if (chunks.length > 0) {
            displayChunk(currentIndex);
        } else {
            display.textContent = "VeloRead";
        }
        updateUI();
    }

    function togglePlayPause() {
        if (intervalId) {
            stopReading();
        } else {
            if (startBtn.innerHTML.includes('Restart')) {
                resetReadingState();
                displayChunk(0);
            } else {
                play();
            }
        }
    }

    window.addEventListener('keydown', (e) => {
        if (e.code === "Space" && e.target !== input) {
            e.preventDefault();
            if (isSpacePressed) return;
            isSpacePressed = true;

            if (startBtn.innerHTML.includes('Restart')) {
                resetReadingState();
                displayChunk(0);
                return;
            }

            if (spaceLogic.value === 'toggle') {
                togglePlayPause();
            } else {
                play();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === "Space") {
            isSpacePressed = false;
            if (spaceLogic.value === 'hold') {
                stopReading();
            }
        }
    });

    startBtn.addEventListener('click', togglePlayPause);
    rewindBtn.addEventListener('click', rewind);

    settingsBtn.addEventListener('click', () => {
        settingsPanel.classList.remove('hidden');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsPanel.classList.add('hidden');
    });

    settingsPanel.addEventListener('click', (e) => {
        if (e.target === settingsPanel) {
            settingsPanel.classList.add('hidden');
        }
    });

    addTextBtn.addEventListener('click', () => {
        textInputPanel.classList.remove('hidden');
    });

    closeTextBtn.addEventListener('click', () => {
        textInputPanel.classList.add('hidden');
    });

    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                input.value = text;
                reset();
                localStorage.setItem('fastReaderText', input.value);
            }
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
        }
    });

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type === "application/pdf") {
            try {
                const arrayBuffer = await file.arrayBuffer();
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = "";

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(" ");
                    fullText += pageText + "\n";
                }

                input.value = fullText.trim();
                textInputPanel.classList.add('hidden');
                reset();
                localStorage.setItem('fastReaderText', input.value);
            } catch (err) {
                console.error('Error reading PDF:', err);
                alert('Error reading PDF file.');
            }
        } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                input.value = result.value.trim();
                textInputPanel.classList.add('hidden');
                reset();
                localStorage.setItem('fastReaderText', input.value);
            } catch (err) {
                console.error('Error reading DOCX:', err);
                alert('Error reading DOCX file.');
            }
        } else if (file.type === "application/epub+zip" || file.name.endsWith(".epub")) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const text = await extractTextFromEpub(arrayBuffer);
                input.value = text;
                textInputPanel.classList.add('hidden');
                reset();
                localStorage.setItem('fastReaderText', input.value);
            } catch (err) {
                console.error('Error reading EPUB:', err);
                alert('Error reading EPUB file.');
            }
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                input.value = e.target.result;
                textInputPanel.classList.add('hidden');
                reset();
                localStorage.setItem('fastReaderText', input.value);
            };
            reader.readAsText(file);
        }
    });



    textInputPanel.addEventListener('click', (e) => {
        if (e.target === textInputPanel) {
            textInputPanel.classList.add('hidden');
        }
    });

    const reset = () => {
        stopReading();
        currentIndex = 0;
        display.textContent = "VeloRead";
        progressBar.style.width = '0%';
        localStorage.setItem('fastReaderIndex', 0);
    };

    fontSizeInput.addEventListener('change', () => {
        applyFontSize(fontSizeInput.value);
        saveSettings();
        reset();
    });

    highlightColorInput.addEventListener('change', () => {
        applyHighlightColor(highlightColorInput.value);
        saveSettings();
        reset();
    });

    resetTextBtn.addEventListener('click', () => {
        localStorage.removeItem('fastReaderText');
        localStorage.removeItem('fastReaderIndex');
        input.value = "";
        reset();
        alert("Text cleared!");
    });

    resetSettingsBtn.addEventListener('click', () => {
        localStorage.removeItem('fastReaderSettings');
        localStorage.removeItem('fastReaderText');
        localStorage.removeItem('fastReaderIndex');
        initializeSettings();
        settingsPanel.classList.add('hidden');
        resetReadingState();
        alert("Settings and data reset!");
    });

    input.addEventListener('input', () => {
        reset();
        localStorage.setItem('fastReaderText', input.value);
    });
    chunkInput.addEventListener('change', reset);
    alignmentInput.addEventListener('change', reset);
    fontInput.addEventListener('change', reset);

    initializeSettings();

});