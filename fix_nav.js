const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(/\.tabs \{ display: inline-flex;[^}]*\}/g, `.tabs-container {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            margin-bottom: 30px;
        }
        .tabs-container::-webkit-scrollbar {
            display: none;
        }
        .tabs { 
            display: inline-flex; gap: 8px; background: rgba(25, 25, 25, 0.6); 
            border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(20px); 
            -webkit-backdrop-filter: blur(20px); padding: 6px; border-radius: 20px; 
            white-space: nowrap; margin-bottom: 0;
        }`);

html = html.replace(/\.tab-btn \{ background: transparent;[^}]*\}/g, `.tab-btn { background: transparent; border: none; color: var(--text-muted); font-size: 13px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 24px; border-radius: 14px; transition: all 0.3s; flex-shrink: 0; }`);

html = html.replace(/\.tab-btn\.active \{ background: rgba\(255, 255, 255, 0\.1\);[^}]*\}/g, `.tab-btn.active { background: rgba(255, 255, 255, 0.12); color: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border-bottom: none; }`);

html = html.replace(/<div class="tabs">([\s\S]*?<\/div>)/, `<div class="tabs-container">
            <div class="tabs">$1
        </div>`);

fs.writeFileSync('index.html', html, 'utf8');
