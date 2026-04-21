const ADAPTER = require('./adapter');
const fetch = require('node-fetch');
const XLSX = require('xlsx');
const path = require('path');

async function diagnose() {
    // 1. Получить имена из YClients API
    const bearer = 'Bearer u8xzkdpkgfc73uektn64';
    const authRes = await fetch('https://api.yclients.com/api/v1/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': bearer, 'Accept': 'application/vnd.yclients.v2+json' },
        body: JSON.stringify({ login: '89854291875', password: 'Googleplay99' })
    });
    const userToken = (await authRes.json()).data.user_token;

    const ycRawNames = new Set();
    const adapterConfig = ADAPTER.ADAPTER;
    for (const [loc, config] of Object.entries(adapterConfig)) {
        const companyId = config.yclients_company_id;
        if (!companyId) continue;
        const url = `https://api.yclients.com/api/v1/records/${companyId}?start_date=2026-04-01&end_date=2026-04-11&count=300`;
        const res = await fetch(url, { headers: { 'Authorization': `${bearer}, User ${userToken}`, 'Accept': 'application/vnd.yclients.v2+json' }});
        if (res.ok) {
            const json = await res.json();
            (json.data || []).forEach(r => { if (r.staff) ycRawNames.add(r.staff.name); });
        }
    }

    // 2. Получить имена из El-Kassa (последний excel файл)
    const DL_DIR = path.join(__dirname, 'downloads');
    const ekRawNames = new Set();
    try {
        const wb = XLSX.readFile(path.join(DL_DIR, 'orders_MTD_ORDERS.xlsx'));
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        rows.forEach(r => { if (r['Сотрудник']) ekRawNames.add(r['Сотрудник'].trim()); });
    } catch(e) { console.log('El-Kassa excel не найден:', e.message); }

    // 3. Диагностика
    console.log('\n=== YClients имена (из API) vs адаптер ===');
    ycRawNames.forEach(name => {
        const mapped = ADAPTER.getDashNameByYclients(name);
        const ok = mapped !== name && !mapped.includes('Неизв');
        console.log(`${ok ? '✅' : '❌'} "${name}" → "${mapped}"`);
    });

    console.log('\n=== El-Kassa имена vs адаптер ===');
    ekRawNames.forEach(name => {
        if (name.toLowerCase() === 'логин') return;
        const mapped = ADAPTER.getDashNameByElkassa(name, null);
        const ok = mapped && mapped !== 'Неизвестный';
        console.log(`${ok ? '✅' : '❌'} "${name}" → "${mapped}"`);
    });

    // 4. Найти мастеров только в одном источнике (потенциальные дубли)
    const ycMapped = new Set([...ycRawNames].map(n => ADAPTER.getDashNameByYclients(n)));
    const ekMapped = new Set([...ekRawNames].filter(n => n.toLowerCase() !== 'логин').map(n => ADAPTER.getDashNameByElkassa(n, null)));
    
    console.log('\n=== Только в YClients (нет в El-Kassa) ===');
    ycMapped.forEach(m => { if (!ekMapped.has(m)) console.log(' ⚠️ ', m); });

    console.log('\n=== Только в El-Kassa (нет в YClients) ===');
    ekMapped.forEach(m => { if (!ycMapped.has(m) && m !== 'Неизвестный') console.log(' ⚠️ ', m); });
}
diagnose();
