const fs = require('fs');

// 1. Add toast container and CSS to index.html
let html = fs.readFileSync('index.html', 'utf8');

const toastCSS = `    <style>
        /* Toast Notification Styles */
        #toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        }
        .grome-toast {
            min-width: 280px;
            max-width: 350px;
            background: rgba(30, 30, 30, 0.95);
            backdrop-filter: blur(10px);
            color: #fff;
            padding: 16px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.05);
            display: flex;
            align-items: center;
            gap: 12px;
            transform: translateX(120%);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            pointer-events: auto;
        }
        .grome-toast.show {
            transform: translateX(0);
            opacity: 1;
        }
        .grome-toast.success { border-left: 4px solid #C4D600; }
        .grome-toast.error { border-left: 4px solid #FF3B30; }
        .grome-toast.info { border-left: 4px solid #0A84FF; }
        .grome-toast-icon { font-size: 18px; }
        .grome-toast-content { flex: 1; line-height: 1.4; }
`;

html = html.replace('    <style>', toastCSS);

const toastHTML = `    <!-- Toast Notification Container -->
    <div id="toast-container"></div>

    <script src="mainscript.js"></script>`;

html = html.replace('    <script src="mainscript.js"></script>', toastHTML);

fs.writeFileSync('index.html', html);


// 2. Add showToast function and replace alerts in mainscript.js
let ms = fs.readFileSync('mainscript.js', 'utf8');

const tstFn = `
// ==== TOAST NOTIFICATIONS ====
window.showToast = function(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return; // fail gracefully

    const toast = document.createElement('div');
    toast.className = 'grome-toast ' + type;
    
    let icon = '???';
    if(type === 'success') icon = '?';
    if(type === 'error') icon = '???';
    
    toast.innerHTML = \`
        <div class="grome-toast-icon">\${icon}</div>
        <div class="grome-toast-content">\${msg}</div>
    \`;
    
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if(toast.parentElement) toast.remove();
        }, 400); // Wait for transition
    }, 3000);
};

`;

// prepend to file
ms = tstFn + ms;

// replace all alerts that are simple string messages
// We handle dynamic messages like \`... \${...}\` carefully
ms = ms.replace(/alert\((['"`].+?['"`])\)/g, 'showToast($1, "success")');
ms = ms.replace(/alert\(("Ошибка|'Ошибка|`Ошибка)(.+?)\)/g, 'showToast($1$2, "error")');
ms = ms.replace(/showToast\((.+?Ошибка.+?), "success"\)/g, 'showToast($1, "error")');

// specific catch blocks or error displays:
ms = ms.replace(/alert\("Ошибка: " \+ /g, 'showToast("Ошибка: " + ');
ms = ms.replace(/alert\('Ошибка загрузки: ' \+ /g, 'showToast("Ошибка загрузки: " + ');
ms = ms.replace(/alert\('Успешно сохранено!'\)/g, 'showToast("Успешно сохранено!", "success")');

// Replace standard alerts containing "Ошибка" to be error type
ms = ms.replace(/showToast\(("[^"]*Ошибка[^"]*"), "success"\)/g, 'showToast($1, "error")');
ms = ms.replace(/showToast\(('[^']*Ошибка[^']*'), "success"\)/g, 'showToast($1, "error")');

fs.writeFileSync('mainscript.js', ms);

console.log("Toasts installed");
