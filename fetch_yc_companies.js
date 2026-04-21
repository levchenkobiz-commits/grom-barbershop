const fetch = require('node-fetch');

const TOKEN = 'Bearer u8xzkdpkgfc73uektn64';

async function fetchCompanies() {
    try {
        const res = await fetch('https://api.yclients.com/api/v1/companies', {
            method: 'GET',
            headers: {
                'Authorization': TOKEN,
                'Accept': 'application/vnd.yclients.v2+json'
            }
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

fetchCompanies();
