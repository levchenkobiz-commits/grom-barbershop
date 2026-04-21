const xlsx = require('xlsx');
const path = require('path');
const cWB = xlsx.readFile(path.join(__dirname, 'downloads', 'clients_NEW_CLIENTS.xlsx'));
const cData = xlsx.utils.sheet_to_json(cWB.Sheets[cWB.SheetNames[0]]);

const phone = "9958872020";
const client = cData.find(c => String(c['Телефон']).includes(phone) || String(c['Phone']).includes(phone));

console.log('Client Created Data:');
console.log(client);
