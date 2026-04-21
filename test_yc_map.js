const dayjs = require('dayjs');
const ADAPTER = require('./adapter');
const fetch = require('node-fetch');

async function testyc() {
    const startMonth = dayjs().startOf('month').format('YYYY-MM-DD');
    const ycEDate = dayjs().format('YYYY-MM-DD');
    let rawYc = [];
    const bearer = 'Bearer u8xzkdpkgfc73uektn64';
    
    // Auth
    const authRes = await fetch('https://api.yclients.com/api/v1/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': bearer, 'Accept': 'application/vnd.yclients.v2+json' },
        body: JSON.stringify({ login: '89854291875', password: 'Googleplay99' })
    });
    const userToken = (await authRes.json()).data.user_token;

    for (const [loc, config] of Object.entries(ADAPTER)) {
        const companyId = config.yclients_company_id;
        if (!companyId) continue;
        let pageNum = 1;
        while (true) {
            const url = `https://api.yclients.com/api/v1/records/${companyId}?start_date=${startMonth}&end_date=${ycEDate}&count=300&page=${pageNum}`;
            const res = await fetch(url, {
                headers: { 'Authorization': `${bearer}, User ${userToken}`, 'Accept': 'application/vnd.yclients.v2+json' }
            });
            if (res.ok) {
                const json = await res.json();
                const data = json.data || [];
                console.log(`Fetched ${loc}: ${data.length} records`);
                data.forEach(r => {
                    if (r.deleted) return;
                    rawYc.push({
                        'Сотрудник': r.staff ? r.staff.name : '',
                        'Филиал': loc
                    });
                });
                if (data.length < 300) break;
                pageNum++;
            } else { 
                console.error(`Error on ${loc}:`, await res.text());
                break; 
            }
        }
    }
    console.log("Total rawYc:", rawYc.length);
}
testyc();
