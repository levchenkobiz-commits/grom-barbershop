const fs = require('fs');
let js = fs.readFileSync('mainscript.js', 'utf8');

const targetStr = `            tbody.innerHTML = list.map(r => {
                const lowV = (r.violation || "").toLowerCase();
                let badgeClass = 'badge-no';
                if (lowV.includes('нет') || lowV.includes('✅')) badgeClass = 'badge-yes';

                const matchVal = (r.match || "").trim() === 'да';
                const matchTag = matchVal 
                    ? \`<span style="color:#34C759; margin-left:4px" title="Чек совпадает">●</span>\`
                    : \`<span style="color:#FF3B30; margin-left:4px" title="Расхождение">●</span>\`;

                return \`<tr>
                    <td data-label="МАСТЕР" style="font-size:14px; padding-left:25px"><b>\${r.barber}</b></td>
                    <td data-label="НАРУШЕНИЕ"><span class="badge-status \${badgeClass}" style="text-align:center">\${r.violation}</span></td>
                    <td data-label="ДАТА ПРОСМ." style="font-size:11px; white-space:nowrap; opacity:0.8">
                            \${dayjs(r.createdAt).format('HH:mm DD.MM')}
                        \${dayjs(r.createdAt).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD') ? '<span style="color:var(--accent); margin-left:3px">●</span>' : ''}
                    </td>
                    <td data-label="САЛОН" style="font-size:13px; font-weight:700; color:var(--accent)">\${r.location}</td>
                    <td style="font-size:13px; opacity:0.7">
                        \${dayjs(r.date || "").format('DD.MM')} \${r.time || ""} 
                        \${matchTag}
                    </td>
                    <td data-label="РАБОТА" style="font-size:12px; opacity:0.7">\${r.notes || '-'}</td>
                </tr>\`;
            }).join('');`;

const replacementStr = `            tbody.innerHTML = list.map(r => {
                const lowV = (r.violation || "").toLowerCase();
                let badgeClass = 'badge-no';
                if (lowV.includes('нет') || lowV.includes('✅')) badgeClass = 'badge-yes';

                const matchVal = (r.match || "").trim() === 'да';
                const matchTag = matchVal 
                    ? \`<span style="color:#34C759; margin-left:4px" title="Чек совпадает">●</span>\`
                    : \`<span style="color:#FF3B30; margin-left:4px" title="Расхождение">●</span>\`;

                const notesRaw = r.notes || '-';
                const canEdit = !notesRaw.includes('отредактировано');
                const editIcon = canEdit ? \`<span style="cursor:pointer; margin-left:8px; display:inline-block;" onclick="editOvnRow(\${r.id})" title="Редактировать">✏️</span>\` : '';

                return \`<tr>
                    <td data-label="МАСТЕР" style="font-size:14px; padding-left:25px"><b>\${r.barber}</b></td>
                    <td data-label="НАРУШЕНИЕ"><span class="badge-status \${badgeClass}" style="text-align:center">\${r.violation}</span></td>
                    <td data-label="ДАТА ПРОСМ." style="font-size:11px; white-space:nowrap; opacity:0.8">
                            \${dayjs(r.createdAt).format('HH:mm DD.MM')}
                        \${dayjs(r.createdAt).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD') ? '<span style="color:var(--accent); margin-left:3px">●</span>' : ''}
                    </td>
                    <td data-label="САЛОН" style="font-size:13px; font-weight:700; color:var(--accent)">\${r.location}</td>
                    <td style="font-size:13px; opacity:0.7">
                        \${dayjs(r.date || "").format('DD.MM')} \${r.time || ""} 
                        \${matchTag}
                    </td>
                    <td data-label="РАБОТА" style="font-size:12px; opacity:0.7">\${notesRaw}\${editIcon}</td>
                </tr>\`;
            }).join('');`;

if (js.includes(targetStr)) {
    js = js.replace(targetStr, replacementStr);
    fs.writeFileSync('mainscript.js', js, 'utf8');
    console.log('Successfully patched history table render!');
} else {
    console.log('Target string not found. Please review the replacement script.');
}
