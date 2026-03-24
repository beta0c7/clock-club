const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');
const select = document.getElementById('config-select');
const loading = document.getElementById('loading');
const nameLabel = document.getElementById('config-name');
const authorLabel = document.getElementById('config-author');

let currentConfig = null;
let animationTimeout = null;
let preloadedImages = {}; // key -> Image
let currentFrame = 0;
let isPlaying = false;

// Convert RGB565 to HTML color #RRGGBB
function rgb565ToHex(color565) {
    if (color565 === undefined || color565 === null) return "#000000";
    
    // Sometimes color is given as a string or hex, ensure integer
    let c = parseInt(color565, 10);
    
    let r = (c >> 11) & 0x1F;
    let g = (c >> 5) & 0x3F;
    let b = c & 0x1F;
    
    r = Math.round((r * 255) / 31);
    g = Math.round((g * 255) / 63);
    b = Math.round((b * 255) / 31);
    
    const hr = r.toString(16).padStart(2, '0');
    const hg = g.toString(16).padStart(2, '0');
    const hb = b.toString(16).padStart(2, '0');
    
    return `#${hr}${hg}${hb}`;
}

// Format datetime like PHP date()
function formatDateTime(formatStr) {
    const d = new Date();
    let result = '';
    for (let i = 0; i < formatStr.length; i++) {
        const c = formatStr[i];
        if (c === 'H') {
            result += d.getHours().toString().padStart(2, '0');
        } else if (c === 'i') {
            result += d.getMinutes().toString().padStart(2, '0');
        } else if (c === 's') {
            result += d.getSeconds().toString().padStart(2, '0');
        } else {
            result += c; // append colon or spaces
        }
    }
    return result;
}

async function loadConfigs() {
    try {
        const res = await fetch('/api/configs');
        const files = await res.json();
        
        select.innerHTML = '';
        files.sort().forEach(file => {
            const option = document.createElement('option');
            option.value = file;
            option.textContent = file;
            select.appendChild(option);
        });
        
        if (files.length > 0) {
            loadConfig(files[0]);
        }
    } catch (err) {
        console.error("Error loading configs:", err);
        select.innerHTML = '<option>Error loading</option>';
    }
}

function loadImage(base64Data) {
    return new Promise((resolve, reject) => {
        if (!base64Data) {
            resolve(null);
            return;
        }
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = "data:image/png;base64," + base64Data;
    });
}

async function loadConfig(filename) {
    stopAnimation();
    loading.classList.remove('hidden');
    
    try {
        const res = await fetch(`/api/config/${encodeURIComponent(filename)}`);
        const config = await res.json();
        
        nameLabel.textContent = config.name || filename;
        authorLabel.textContent = config.author || 'Unknown';
        
        currentConfig = config;
        preloadedImages = {};
        
        // Preload setup images
        if (config.setup) {
            for (const item of config.setup) {
                if (item.type === 'image' && item.image) {
                    preloadedImages[item.id] = await loadImage(item.image);
                }
            }
        }
        
        // Preload sprite images
        if (config.sprites) {
            for (let i = 0; i < config.sprites.length; i++) {
                const spriteArray = config.sprites[i];
                for (let j = 0; j < spriteArray.length; j++) {
                    const s = spriteArray[j];
                    if (s.image) {
                        const id = s.id || `sprite_${i}_${j}`;
                        s.id = id; // Ensure ID exists for reference
                        preloadedImages[id] = await loadImage(s.image);
                    }
                }
            }
        }
        
        loading.classList.add('hidden');
        startAnimation();
        
    } catch (err) {
        console.error("Error loading config:", err);
        loading.classList.add('hidden');
    }
}

function draw() {
    if (!currentConfig) return;
    
    // 1. Draw Background
    const bgColor = rgb565ToHex(currentConfig.bgColor);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 64, 64);
    
    // 2. Draw Setup Elements
    if (currentConfig.setup) {
        for (const item of currentConfig.setup) {
            if (item.type === 'image' && preloadedImages[item.id]) {
                ctx.drawImage(preloadedImages[item.id], item.x, item.y);
            } 
            else if (item.type === 'datetime' || item.type === 'text') {
                const text = item.type === 'datetime' ? formatDateTime(item.content) : item.content;
                ctx.fillStyle = rgb565ToHex(item.fgColor);
                
                // Set an appropriate small font.
                let fontSize = 8;
                if (item.font === "medium") fontSize = 10;
                ctx.font = `${fontSize}px monospace`;
                ctx.textBaseline = "top";
                
                ctx.fillText(text, item.x, item.y);
            }
        }
    }
    
    // 3. Draw Loop Elements (Sprites)
    const now = new Date();
    const seconds = now.getSeconds();
    const isMinuteHit = seconds === 0;
    const isDeadState = seconds >= 0 && seconds < 3; // Stay dead for first 3 seconds of the minute

    if (currentConfig.loop && currentConfig.sprites) {
        for (const item of currentConfig.loop) {
            if (item.type === 'sprite') {
                const spriteIndex = item.sprite;
                
                // 60-second kill logic: Hide enemy (sprite index 1)
                if (isDeadState && spriteIndex === 1) {
                    continue; 
                }

                // Draw Slash at 0 seconds
                if (isMinuteHit && spriteIndex === 0) {
                     ctx.fillStyle = "white";
                     ctx.fillRect(item.x + 8, item.y, 4, 12); // Simple slash
                }

                const spriteFrames = currentConfig.sprites[spriteIndex];
                
                if (spriteFrames && spriteFrames.length > 0) {
                    const frameIndex = currentFrame % spriteFrames.length;
                    const frame = spriteFrames[frameIndex];
                    
                    if (frame && preloadedImages[frame.id]) {
                        ctx.drawImage(preloadedImages[frame.id], item.x, item.y);
                    }
                }
            }
        }
    }
}

function loop() {
    if (!isPlaying) return;
    draw();
    currentFrame++;
    
    const delay = currentConfig.delay || 100; // ms
    
    // Request next frame
    animationTimeout = setTimeout(loop, delay);
}

function startAnimation() {
    isPlaying = true;
    currentFrame = 0;
    loop();
}

function stopAnimation() {
    isPlaying = false;
    if (animationTimeout) {
        clearTimeout(animationTimeout);
        animationTimeout = null;
    }
}

select.addEventListener('change', (e) => {
    if (e.target.value) {
        loadConfig(e.target.value);
    }
});

// Init
loadConfigs();