const fetch = require('node-fetch');

const login = '89854291875';
const pass = 'Googleplay99';
const bearer = 'Bearer u8xzkdpkgfc73uektn64';

async function auth() {
    const res = await fetch('https://api.yclients.com/api/v1/auth', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': bearer,
            'Accept': 'application/vnd.yclients.v2+json'
        },
        body: JSON.stringify({
            login: login,
            password: pass
        })
    });
    
    if (!res.ok) {
        console.error('Login failed:', res.status, await res.text());
        return;
    }
    const data = await res.json();
    console.log('User Token:', data.data.user_token);
}

auth();
