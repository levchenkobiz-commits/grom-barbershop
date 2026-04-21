const fetch = require('node-fetch');

const login = '89854291875';
const pass = 'Googleplay99';
const bearer = 'Bearer u8xzkdpkgfc73uektn64';

async function testFetch() {
    const resAuth = await fetch('https://api.yclients.com/api/v1/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': bearer, 'Accept': 'application/vnd.yclients.v2+json' },
        body: JSON.stringify({ login, password: pass })
    });
    const authData = await resAuth.json();
    const userToken = authData.data.user_token;

    const startDate = '2026-04-01';
    const endDate = '2026-04-11';
    
    const companyId = '1113666'; // Алексеевская
    const url = `https://api.yclients.com/api/v1/records/${companyId}?start_date=${startDate}&end_date=${endDate}&count=200`;
    
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `${bearer}, User ${userToken}`,
            'Accept': 'application/vnd.yclients.v2+json'
        }
    });
    
    if (res.ok) {
        const json = await res.json();
        console.log(`Success! Found ${json.data ? json.data.length : 'unknown'} records.`);
        if (json.data && json.data.length > 0) {
            console.log('Sample record:', {
                id: json.data[0].id,
                staff_name: json.data[0].staff.name,
                is_deleted: json.data[0].is_deleted,
                attendance: json.data[0].attendance
            });
        }
    }
}
testFetch();
