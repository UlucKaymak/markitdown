(function () {
    // --- Configuration ---
    var peer = null;
    var conn = null;
    var myAliasID = "";
    var queuedFiles = [];

    // --- Alias Generators ---
    var adjectives = [
        "uprising", "hippie", "blank", "philosophical", "pixelated", "melancholic", "crunchy",
        "electronic", "shameless", "vegan", "rusty", "evaporated", "indecisive", "sarcastic",
        "synthetic", "parallel", "geometric", "transparent", "tired", "aggressive", "symmetric",
        "cosmic", "miniature", "fluid", "gravity-free", "resentful", "digital", "velvet",
        "anarchist", "porcelain", "blurry", "rhythmic", "metallic", "plastic", "acidic",
        "neurotic", "square", "smoked", "wind-up", "acrobatic", "abstract", "organic",
        "vintage", "static", "hypnotic", "ironic", "futuristic", "cutesy", "hollow",
        "virtual", "atonal", "decayed", "shattered", "monotonous",
        "electromagnetic", "boiled", "simulationist", "holographic", "shoeless",
        "unadjusted", "crypto", "nostalgic", "mechanical", "sarky", "pastoral", "chaotic",
        "sterile", "mystic", "potato-fied", "striped", "checkered", "bubbling",
        "cubic", "asymmetric", "melodic", "sentimental", "technological", "primitive", "galactic",
        "nanotechnological", "experimental", "eccentric", "absurd", "shiny", "matte", "salty",
        "sour", "sweetish", "wild", "domesticated", "smart", "stupid", "drunk", "sober",
        "parasitic", "reverberating", "silent"
    ];
    var nouns = [
        "zinccarbonbattery", "lizard", "notebook", "toaster", "modem", "pixel",
        "grasshopper", "radiator", "keyboard", "mushroom", "jellyfish", "muesli", "outlet",
        "cactus", "penguin", "broccoli", "headphones", "astronaut", "toothpick", "lego",
        "box", "balloon", "detergent", "ant", "umbrella", "cloud", "screw", "lightbulb",
        "misdemeanor", "statue", "microchip", "notepad", "television", "jar",
        "fruitjuice", "slipper", "curtain", "guitar", "telescope", "microscope", "chessboard",
        "tomato", "eggplant", "daisy", "satellite", "planetesimal", "ventilator",
        "pencil", "eraser", "mouse", "speaker", "wallclock", "hourglass", "mirror",
        "lighter", "keychain", "coin", "newspaper", "magazine", "coffeemachine",
        "iron", "brush", "soap", "toothpaste", "towel", "blanket", "pillow",
        "armchair", "coffeetable", "lamp", "bicycle", "skateboard", "skates", "drone",
        "robot", "algorithm", "database", "pixel", "monitor", "processor", "memory",
        "graphicscard", "motherboard", "powersupply", "cable", "socket", "plug", "switch",
        "lock", "doorhandle", "window", "ladder", "roof", "chimney", "wall",
        "floor", "ceiling", "room", "house"
    ];

    // --- DOM Elements ---
    var els = {};

    function getElements() {
        els.myId = document.getElementById('display-peer-id');
        els.status = document.getElementById('conn-status-text');
        els.remoteId = document.getElementById('target-id-input');
        els.connectBtn = document.getElementById('start-connect-btn');
        els.panel = document.getElementById('main-transfer-panel');
        els.dropZone = document.getElementById('file-drop-zone');
        els.fileInput = document.getElementById('main-file-input');
        els.filesList = document.getElementById('selected-files-list');
        els.sendBtn = document.getElementById('execute-send-btn');
        els.progress = document.getElementById('transfer-progress-bar');
        els.incomingList = document.getElementById('files-list-container');
        els.copyBtn = document.getElementById('copy-id-btn');
        els.shareCard = document.getElementById('share-url-card');
        els.shareUrl = document.getElementById('display-share-url');
        els.copyShareBtn = document.getElementById('copy-share-url-btn');
        els.downloadCard = document.getElementById('main-download-card');
    }

    // --- Core Functions ---
    function init() {
        getElements();

        // Check if PeerJS is loaded
        if (typeof Peer === 'undefined') {
            els.status.textContent = "Error: PeerJS library missing.";
            els.status.style.color = "red";
            return;
        }

        myAliasID = generateSafeId();
        startPeerNetwork();
        bindEvents();
    }

    function generateSafeId() {
        var adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        var noun = nouns[Math.floor(Math.random() * nouns.length)];
        return (adj + "-" + noun).toLowerCase();
    }

    function updateShareLink() {
        if (!myAliasID) return;
        var url = new URL(window.location.href);
        url.searchParams.set('id', myAliasID);
        var shareUrl = url.toString();
        els.shareUrl.textContent = shareUrl;
        
        if (queuedFiles.length > 0) {
            els.shareCard.style.display = "block";
        } else {
            els.shareCard.style.display = "none";
        }
    }

    function startPeerNetwork() {
        if (peer) peer.destroy();

        els.status.textContent = "Connecting to cloud...";

        try {
            peer = new Peer(myAliasID, {
                debug: 1,
                config: { 'iceServers': [{ url: 'stun:stun.l.google.com:19302' }] }
            });

            peer.on('open', function (id) {
                if (els.myId) els.myId.textContent = id;
                if (els.status) {
                    els.status.textContent = "Online & Ready.";
                    els.status.style.color = "#27ae60"; // Green
                }
                updateShareLink();
                checkAutoConnect();
            });

            peer.on('connection', function (c) {
                if (conn) { conn.close(); }
                setupConnection(c);
            });

            peer.on('error', function (err) {
                console.error("Peer Error:", err);
                if (err.type === 'unavailable-id') {
                    myAliasID = generateSafeId();
                    startPeerNetwork();
                } else if (err.type === 'network') {
                    if (els.status) {
                        els.status.textContent = "Network Error. Retrying...";
                        setTimeout(startPeerNetwork, 3000);
                    }
                } else {
                    if (els.status) {
                        els.status.textContent = "Error: " + err.type;
                        els.status.style.color = "#e74c3c";
                    }
                }
            });

            peer.on('disconnected', function () {
                if (els.status) els.status.textContent = "Disconnected. Reconnecting...";
                peer.reconnect();
            });

        } catch (e) {
            console.error("Peer Init Error:", e);
            els.status.textContent = "Critical Error: " + e.message;
        }
    }

    function checkAutoConnect() {
        var params = new URLSearchParams(window.location.search);
        var targetId = params.get('id');
        if (targetId && targetId !== myAliasID) {
            els.status.textContent = "Auto-connecting to " + targetId + "...";
            var c = peer.connect(targetId, { metadata: { name: myAliasID } });
            setupConnection(c);
        }
    }

    function bindEvents() {
        if (els.connectBtn) {
            els.connectBtn.onclick = function () {
                var id = els.remoteId.value.trim().toLowerCase();
                if (id) {
                    els.status.textContent = "Dialing " + id + "...";
                    var c = peer.connect(id, { metadata: { name: myAliasID } });
                    setupConnection(c);
                }
            };
        }

        if (els.copyBtn) {
            els.copyBtn.onclick = function () {
                navigator.clipboard.writeText(els.myId.textContent).then(function () {
                    var icon = els.copyBtn.querySelector('i');
                    icon.className = "fas fa-check";
                    setTimeout(function () { icon.className = "fas fa-copy"; }, 2000);
                });
            };
        }

        if (els.copyShareBtn) {
            els.copyShareBtn.onclick = function () {
                navigator.clipboard.writeText(els.shareUrl.textContent).then(function () {
                    var icon = els.copyShareBtn.querySelector('i');
                    icon.className = "fas fa-check";
                    setTimeout(function () { icon.className = "fas fa-link"; }, 2000);
                });
            };
        }

        // File Handling
        if (els.dropZone) {
            els.dropZone.onclick = function () { els.fileInput.click(); };

            ['dragenter', 'dragover'].forEach(n => {
                els.dropZone.addEventListener(n, (e) => { e.preventDefault(); els.dropZone.classList.add('highlight'); });
            });
            ['dragleave', 'drop'].forEach(n => {
                els.dropZone.addEventListener(n, (e) => { e.preventDefault(); els.dropZone.classList.remove('highlight'); });
            });

            els.dropZone.addEventListener('drop', function (e) {
                e.preventDefault();
                if (e.dataTransfer.files.length > 0) onFilesAdded(e.dataTransfer.files);
            });
        }

        if (els.fileInput) {
            els.fileInput.onchange = function (e) {
                if (e.target.files.length > 0) onFilesAdded(e.target.files);
            };
        }

        if (els.sendBtn) {
            els.sendBtn.onclick = function () {
                sendQueuedFiles();
            };
        }
    }

    function onFilesAdded(files) {
        for (var i = 0; i < files.length; i++) {
            queuedFiles.push(files[i]);
        }
        renderQueuedFiles();
        updateShareLink();
        
        if (conn && conn.open) {
            els.sendBtn.disabled = false;
        } else {
            els.sendBtn.disabled = true;
            els.sendBtn.textContent = "Waiting for Connection...";
        }
    }

    function renderQueuedFiles() {
        els.filesList.innerHTML = "";
        queuedFiles.forEach((file, index) => {
            var div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `<div><strong>${file.name}</strong> (${(file.size / 1024 / 1024).toFixed(2)} MB)</div>
                             <button class="small-btn remove-file" data-index="${index}"><i class="fas fa-times"></i></button>`;
            els.filesList.appendChild(div);
        });

        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.onclick = function(e) {
                var idx = parseInt(this.getAttribute('data-index'));
                queuedFiles.splice(idx, 1);
                renderQueuedFiles();
                updateShareLink();
            };
        });

        if (queuedFiles.length > 0) {
            els.sendBtn.style.display = "block";
        } else {
            els.sendBtn.style.display = "none";
        }
    }

    async function sendQueuedFiles() {
        if (queuedFiles.length === 0 || !conn || !conn.open) return;

        els.sendBtn.disabled = true;
        els.sendBtn.textContent = "Sending...";
        
        for (var i = 0; i < queuedFiles.length; i++) {
            var file = queuedFiles[i];
            els.status.textContent = `Sending: ${file.name}...`;
            els.progress.style.width = `${((i + 1) / queuedFiles.length) * 100}%`;
            
            conn.send({ type: 'meta', name: file.name, size: file.size, fileType: file.type, sender: myAliasID });
            conn.send({ type: 'file', content: file });
            
            // Wait a bit between files to avoid overwhelming the buffer if needed
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        els.sendBtn.textContent = "Sent!";
        els.status.textContent = "All files sent.";
        setTimeout(function () {
            els.sendBtn.textContent = "Send Files";
            els.sendBtn.disabled = false;
            els.progress.style.width = "0%";
            // Optionally clear queue? The user said "share link to download", 
            // usually implies the queue stays if they want to share with multiple people.
        }, 2000);
    }

    function setupConnection(c) {
        conn = c;

        conn.on('open', function () {
            var rName = (conn.metadata && conn.metadata.name) ? conn.metadata.name : "Remote";
            els.status.textContent = "Connected: " + rName;
            els.status.style.color = "#3498db";
            els.downloadCard.style.display = "block";

            // Send Handshake
            conn.send({ type: 'handshake', name: myAliasID });
            
            // If we have queued files, enable send button
            if (queuedFiles.length > 0) {
                els.sendBtn.disabled = false;
                els.sendBtn.textContent = "Send Prepared Files";
                
                // Auto-send if we are the "sharer" (someone connected to our ID via link)
                // Actually, let's just enable the button for now, or auto-send if there's a param?
                // Better: if someone connects to US, and we have files, we can just send.
                // But let's check if the connection was initiated by them.
                // PeerJS doesn't easily say who initiated in the 'connection' event callback 
                // unless we check metadata or similar.
                
                // Auto-send logic:
                setTimeout(() => {
                    if (confirm(`Connected to ${rName}. Send prepared files?`)) {
                        sendQueuedFiles();
                    }
                }, 500);
            }
        });

        conn.on('data', function (data) {
            if (data.type === 'handshake') {
                els.status.textContent = "Connected: " + data.name;
            } else if (data.type === 'meta') {
                this.incomingMeta = data;
            } else if (data.type === 'file') {
                var m = this.incomingMeta;
                var blob = new Blob([data.content], { type: m.fileType });
                var url = URL.createObjectURL(blob);

                var ph = els.incomingList.querySelector('.placeholder-text');
                if (ph) ph.remove();

                var div = document.createElement('div');
                div.className = 'file-item';
                div.innerHTML = `<div><strong>${m.name}</strong></div><a href="${url}" download="${m.name}"><button class="small-btn"><i class="fas fa-download"></i></button></a>`;
                els.incomingList.appendChild(div);
                
                els.downloadCard.style.display = "block";
            }
        });

        conn.on('close', function () {
            els.status.textContent = "Connection Lost.";
            els.status.style.color = "#e74c3c";
            setTimeout(function () { location.reload(); }, 2000);
        });

        conn.on('error', function (err) {
            console.error("Conn Error:", err);
        });
    }

    // Init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();