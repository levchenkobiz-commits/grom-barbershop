const xlsx = require('xlsx');
const fs = require('fs');

const workbook = xlsx.readFile('./sheet.xlsx');
let allReports = [];
let idCounter = Date.now() - 100000;

workbook.SheetNames.forEach(sheetName => {
    if (!sheetName.toLowerCase().includes('овн')) return;
    
    const sheet = workbook.Sheets[sheetName];
    const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let currentLocation = '';
    let currentBarber = '';

    // skip headers
    for(let i=8; i<json.length; i++) {
        const row = json[i];
        if(!row || row.length === 0) continue;
        
        let locRaw = row[0];
        let barbRaw = row[1];
        
        if (locRaw && typeof locRaw === 'string' && locRaw.trim()) currentLocation = locRaw.trim();
        if (barbRaw && typeof barbRaw === 'string' && barbRaw.trim()) currentBarber = barbRaw.trim();
        
        const dateCode = row[2];
        const timeStr = row[3];
        const cost = row[4];
        const match = row[5];
        const nation = row[6];
        const violationRaw = row[7];
        const notesRaw = row[8];
        
        if (!dateCode) continue; // typically an empty row if no date
        
        let parsedDateObj = xlsx.SSF.parse_date_code(dateCode);
        let dateStr = "";
        if (parsedDateObj) {
            let m = String(parsedDateObj.m).padStart(2, '0');
            let d = String(parsedDateObj.d).padStart(2, '0');
            dateStr = `${parsedDateObj.y}-${m}-${d}`;
        }
        
        const mapViolation = (v, n) => {
            if (!v) return { v: '✅ Замечаний нет', n: n || '' };
            let low = String(v).toLowerCase();
            let mapped = [];
            let extraNotes = [];
            
            if (low.includes('замечаний нет')) mapped.push('✅ Замечаний нет');
            if (low.includes('про акцию не сказал')) mapped.push('⚠️ Про акцию не сказал');
            if (low.includes('телефон')) mapped.push('📱 Телефон при клиенте');
            if (low.includes('неоплаченная')) mapped.push('💸 Неоплаченная стрижка');
            if (low.includes('зеркало')) mapped.push('🪞 Не показал зеркало заднего вида');
            if (low.includes('инструмент') || low.includes('убрал')) mapped.push('🧼 Не обработал инструмент');
            if (low.includes('форма')) mapped.push('📝 Другое (в коммент.)'); // Mapping form issues to others if no specific
            
            if (mapped.length === 0) {
                mapped.push('📝 Другое (в коммент.)');
                extraNotes.push("В таблице: " + String(v).trim());
            } else if (low.includes('замечаний нет') && low !== 'замечаний нет') {
                extraNotes.push("В таблице: " + String(v).trim());
            }
            
            if (n) extraNotes.push(String(n).trim());
            
            return {
                v: mapped.join(', '),
                n: extraNotes.join(' | ')
            };
        };

        const { v, n } = mapViolation(violationRaw, notesRaw);
        
        idCounter++;
        allReports.push({
            location: currentLocation,
            barber: currentBarber,
            date: dateStr,
            time: String(timeStr || "00:00").replace('.', ':'),
            cost: cost || '',
            match: match || '',
            nation: nation || '',
            violation: v,
            notes: n,
            id: idCounter,
            createdAt: new Date(dateStr + "T00:00:00Z").toISOString() // Fake createdAt to match the row's date
        });
    }
});

console.log('Parsed ' + allReports.length + ' historical checks.');

// Merge with existing
let currentReports = [];
try {
    currentReports = JSON.parse(fs.readFileSync('./ovn_reports.json', 'utf8'));
} catch(e) {}

const newSet = [...currentReports, ...allReports];
fs.writeFileSync('./ovn_reports.json', JSON.stringify(newSet, null, 2));

console.log('Saved to ovn_reports.json successfully. Now upload this file to VPS.');
