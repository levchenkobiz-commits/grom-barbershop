const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>') + 8;
if (styleStart !== -1 && styleEnd !== -1) {
    let css = html.substring(styleStart + 7, styleEnd - 8);

    // 1. Root & background
    css = css.replace(/--bg: #000;/g, '--bg: #050505;');
    css = css.replace(/--card-bg: #111;/g, '--card-bg: rgba(255,255,255,0.03);');
    css = css.replace(/--card-border: #222;/g, '--card-border: rgba(255,255,255,0.08);');
    css = css.replace(/--text-muted: #888;/g, '--text-muted: #8e8e93;\n            --glass-blur: blur(24px);');
    css = css.replace(/body {([\s\S]*?)background: var\(--bg\); color: var\(--text\);([\s\S]*?)}/g, 
        'body {$1background: radial-gradient(circle at 15% 50%, rgba(255, 255, 255, 0.04), transparent 35%), radial-gradient(circle at 85% 30%, rgba(200, 200, 200, 0.04), transparent 35%), var(--bg); background-attachment: fixed; color: var(--text);$2}');

    // 2. Buttons & Tabs
    css = css.replace(/\.btn-refresh {([\s\S]*?)background: var\(--accent\); color: #000; border: none;([\s\S]*?)}/g, 
        '.btn-refresh {$1background: rgba(255,255,255, 0.1); color: #fff; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);$2}');
    css = css.replace(/\.btn-refresh:hover { transform: scale\(1.02\); opacity: 0.9; }/g, 
        '.btn-refresh:hover { transform: translateY(-2px); background: rgba(255,255,255,0.15); box-shadow: 0 4px 15px rgba(0,0,0,0.3); }');
    
    // Tabs
    css = css.replace(/\.tabs {([\s\S]*?)}/g, '.tabs { display: inline-flex; gap: 8px; margin-bottom: 40px; background: rgba(25, 25, 25, 0.5); border: 1px solid var(--card-border); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); padding: 6px; border-radius: 20px; }');
    css = css.replace(/\.tab-btn {([\s\S]*?)}/g, '.tab-btn { background: transparent; border: none; color: var(--text-muted); font-size: 13px; font-weight: 600; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 20px; border-radius: 14px; transition: 0.3s; }');
    css = css.replace(/\.tab-btn\.active {([\s\S]*?)}/g, '.tab-btn.active { background: rgba(255, 255, 255, 0.1); color: var(--text); box-shadow: 0 2px 10px rgba(0,0,0,0.2); border-bottom: none; }');

    // 3. Cards & Containers (Glassmorphism)
    css = css.replace(/\.card {([\s\S]*?)padding: 30px;/g, '.card {$1backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3); padding: 30px;');
    css = css.replace(/\.card:hover { border-color: var\(--accent\); background: #161616; }/g, '.card:hover { border-color: rgba(255, 255, 255, 0.2); background: rgba(255,255,255,0.06); transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4); }');
    
    css = css.replace(/\.drilldown {([\s\S]*?)margin-top: 40px;/g, '.drilldown {$1backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3); margin-top: 40px;');
    css = css.replace(/\.ovn-matrix-container {([\s\S]*?)border-radius: 28px;/g, '.ovn-matrix-container {$1backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3); border-radius: 28px;');
    css = css.replace(/\.sched-table-wrapper {([\s\S]*?)border-radius: 20px;/g, '.sched-table-wrapper {$1backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3); border-radius: 20px;');

    // 4. Modals and Forms
    css = css.replace(/#sched-context-menu {([\s\S]*?)background: #222; border: 1px solid #444;([\s\S]*?)display: none;/g, '#sched-context-menu {$1background: rgba(30, 30, 30, 0.7); border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);$2display: none;');
    css = css.replace(/\.time-picker-popover {([\s\S]*?)background: #222;([\s\S]*?)display: none;/g, '.time-picker-popover {$1background: rgba(30, 30, 30, 0.7);$2display: none; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);');

    css = css.replace(/\.modal {([\s\S]*?)background: rgba\(0,0,0,0\.8\);([\s\S]*?)}/g, '.modal {$1background: rgba(0,0,0,0.4);$2}');
    css = css.replace(/\.modal-content {([\s\S]*?)background: #1c1c1c;([\s\S]*?)max-width: 700px;/g, '.modal-content {$1background: rgba(20, 20, 22, 0.6); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); box-shadow: 0 24px 64px rgba(0,0,0,0.6);$2max-width: 700px;');

    css = css.replace(/input, select, textarea {([\s\S]*?)background: #222; border: 1px solid #333;([\s\S]*?)}/g, 'input, select, textarea {$1background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); transition: border-color 0.2s, background 0.2s;$2}');
    css = css.replace(/input:focus, select:focus { outline: none; border-color: var\(--accent\); }/g, 'input:focus, select:focus { outline: none; border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.05); }');

    // 5. Login
    css = css.replace(/\.login-wrapper {([\s\S]*?)text-align: center; background: radial-gradient\(circle at top, #1a1a1a 0%, #000 100%\);/g, '.login-wrapper {$1text-align: center; background: radial-gradient(circle at 15% 50%, rgba(255, 255, 255, 0.04), transparent 25%), #050505;');
    css = css.replace(/\.login-card {([\s\S]*?)background: rgba\(17, 17, 17, 0\.85\);([\s\S]*?)box-shadow: 0 20px 50px rgba\(0,0,0,0\.5\); backdrop-filter: blur\(20px\);/g, '.login-card {$1background: rgba(20, 20, 22, 0.5);$2box-shadow: 0 24px 64px rgba(0,0,0,0.6); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px);');

    // 6. Cleaning App Dashboard Card
    css = css.replace(/\.cleaning-inner {([\s\S]*?)background: var\(--card-bg\);/g, '.cleaning-inner {$1background: rgba(20, 20, 22, 0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);');

    html = html.substring(0, styleStart + 7) + css + html.substring(styleEnd - 8);
    fs.writeFileSync('index.html', html, 'utf8');
    console.log('CSS Replaced Successfully!');
} else {
    console.log('Style tag not found');
}
