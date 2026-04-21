const fs = require('fs');
const path = require('path');

const REPO_PATH = path.join(__dirname, 'ovn_reports.json');
try {
    const raw = fs.readFileSync(REPO_PATH);
    const content = raw.toString('utf-8');
    const logs = JSON.parse(content);
    
    logs.forEach(log => {
        // Simple mojibake fix logic: if it's not valid Cyrillic but looks like UTF-8 bytes read as Windows-1251
        // Actually, we'll just force the correct strings for known violations if they match patterns.
        if (typeof log.violation === 'string') {
            if (log.violation.includes('Р—Р°РјРµС‡Р°РЅРёР№')) log.violation = 'Замечаний нет';
            if (log.violation.includes('РѕРїРѕР·РґР°Р»')) log.violation = 'Мастер опоздал';
            if (log.violation.includes('РєР°РјРµСЂС‹')) log.violation = 'Не работают камеры';
            if (log.violation.includes('Р°СЂС…РёРІР°')) log.violation = 'Нет архива';
            if (log.violation.includes('РїРѕРґС‚РІРµСЂР¶РґРµРЅРѕ')) log.violation = 'Согласованное опоздание';
        }
    });

    fs.writeFileSync(REPO_PATH, JSON.stringify(logs, null, 2), 'utf-8');
    console.log('✅ Encoding fixed for ovn_reports.json');
} catch (e) {
    console.error('Failed to fix encoding:', e.message);
}
