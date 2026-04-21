const fs = require('fs');

// 1. Modifying index.html
let html = fs.readFileSync('index.html', 'utf8');

// Add classes to tables
html = html.replace('<table id="drilldown-ovn-table">', '<table id="drilldown-ovn-table" class="journal-table">');
html = html.replace('<table id="drilldown-lates-table">', '<table id="drilldown-lates-table" class="journal-table">');

// Add CSS rules
const cssRule = `
        @media (max-width: 768px) {
            .journal-table { display: block; width: 100%; border-collapse: separate; border-spacing: 0; }
            .journal-table thead { display: none; }
            .journal-table tbody { display: block; width: 100%; }
            .journal-table tr { 
                display: block; width: 100%;
                background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); 
                border-radius: 16px; padding: 16px; margin-bottom: 16px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            }
            .journal-table td { 
                display: flex; justify-content: space-between; align-items: center;
                padding: 10px 0; font-size: 14px; text-align: right; 
                border-bottom: 1px solid rgba(255,255,255,0.04);
            }
            .journal-table td:last-child { border-bottom: none; }
            .journal-table td::before { 
                content: attr(data-label); 
                color: var(--text-muted); 
                font-size: 11px; font-weight: 700; text-transform: uppercase; 
                flex-shrink: 0; text-align: left; margin-right: 15px;
            }
            
            /* Highlight Master Name */
            .journal-table td[data-label="МАСТЕР"] {
                font-size: 18px; font-weight: 800; color: #fff;
                border-bottom: 1px dashed rgba(255,255,255,0.1);
                margin-bottom: 8px; padding-bottom: 12px;
                justify-content: flex-start;
            }
            .journal-table td[data-label="МАСТЕР"]::before { display: none; }
        }
`;

if (!html.includes('.journal-table { display: block;')) {
    html = html.replace('</style>', cssRule + '\n    </style>');
}
fs.writeFileSync('index.html', html, 'utf8');

// 2. Modifying mainscript.js
let js = fs.readFileSync('mainscript.js', 'utf8');

// OVN replace
js = js.replace(
    /<td>\$\{row\['Мастер'\]\}<\/td>[\s\S]*?<td><span class=\"\$\{badgeClass\}\">\$\{hasErrText\}<\/span><\/td>[\s\S]*?<td>\$\{row\['Дата'\]\}<\/td>[\s\S]*?<td>\$\{row\['Локация'\]\}<\/td>[\s\S]*?<td>\$\{row\['Пост'\]\}<\/td>[\s\S]*?<td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="\$\{row\['Услуга'\]\}">[\s\S]*?\$\{row\['Услуга'\]\}[\s\S]*?<\/td>/m,
    `<td data-label="МАСТЕР">\${row['Мастер']}</td>
                <td data-label="НАРУШЕНИЕ"><span class="\${badgeClass}">\${hasErrText}</span></td>
                <td data-label="ДАТА / ВРЕМЯ">\${row['Дата']}</td>
                <td data-label="ЛОКАЦИЯ">\${row['Локация']}</td>
                <td data-label="ПОСТ/ТЕРМИНАЛ">\${row['Пост']}</td>
                <td data-label="ПРОВЕРЯЕМАЯ УСЛУГА" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="\${row['Услуга']}">
                    \${row['Услуга']}
                </td>`
);

// Lates replace
js = js.replace(
    /<td>\$\{mName\}<\/td>[\s\S]*?<td><span style="color:\$\{statusColor\}; font-weight:600;">\$\{statusText\}<\/span><\/td>[\s\S]*?<td>\$\{j\.date\}<\/td>[\s\S]*?<td><span style="color:var\(--accent\); font-weight:700;">\$\{j\.location\}<\/span><\/td>[\s\S]*?<td>\$\{tgtTime\}<\/td>[\s\S]*?<td><span style="font-weight:700;\$\{actualArrival !== '-' \? '' : ' color:\#888;'\};">\$\{actualArrival\}<\/span><\/td>[\s\S]*?<td>\$\{delayStr\}<\/td>/m,
    `<td data-label="МАСТЕР">\${mName}</td>
                <td data-label="НАРУШЕНИЕ"><span style="color:\${statusColor}; font-weight:600;">\${statusText}</span></td>
                <td data-label="ДАТА / ВРЕМЯ">\${j.date}</td>
                <td data-label="ЛОКАЦИЯ"><span style="color:var(--accent); font-weight:700;">\${j.location}</span></td>
                <td data-label="ГРАФИК">\${tgtTime}</td>
                <td data-label="ПРИХОД"><span style="font-weight:700;\${actualArrival !== '-' ? '' : ' color:#888;'}">\${actualArrival}</span></td>
                <td data-label="ЗАДЕРЖКА">\${delayStr}</td>`
);

fs.writeFileSync('mainscript.js', js, 'utf8');
console.log('Mobile cards applied!');
