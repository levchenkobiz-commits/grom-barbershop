const fetch = require('node-fetch');
const TOKEN = 'Bearer u8xzkdpkgfc73uektn64';

async function testYcRecords() {
    const companyId = '1113666'; // from ADAPTER for Алексеевская
    const startDate = '2026-04-01';
    const endDate = '2026-04-11';
    
    // According to docs, to get all records within a date range we might need pagination if >300
    const url = `https://api.yclients.com/api/v1/records/${companyId}?start_date=${startDate}&end_date=${endDate}`;
    console.log('Fetching', url);
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': TOKEN,
            'Accept': 'application/vnd.yclients.v2+json'
        }
    });
    
    if (res.ok) {
        const json = await res.json();
        console.log(`Success! Found ${json.data ? json.data.length : 'unknown'} records.`);
        if (json.data && json.data.length > 0) {
            console.log('Sample record:', {
                id: json.data[0].id,
                staff_id: json.data[0].staff.id,
                staff_name: json.data[0].staff.name,
                services: json.data[0].services ? json.data[0].services.map(s => s.title) : [],
                date: json.data[0].date
            });
        }
    } else {
        console.error('Error:', res.status, await res.text());
    }
}
testYcRecords();
