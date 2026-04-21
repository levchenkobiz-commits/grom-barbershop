const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const data = require('./data.json');
const sw = data.salaryWeekly;

const startD = '2026-04-06';
const endD = '2026-04-12';

const swStart = dayjs(sw.start, "DD.MM.YYYY").format('YYYY-MM-DD');
const swEnd = dayjs(sw.end, "DD.MM.YYYY").format('YYYY-MM-DD');

console.log("swStart:", swStart, "equals startD?", swStart === startD);
console.log("swEnd:", swEnd, "equals endD?", swEnd === endD);

const mName = 'Шавкат';
const ADAPTER = require('./adapter.js');

let elkassaName = mName;
for (const loc in ADAPTER) {
    const matchM = ADAPTER[loc].masters.find(x => x.dash === mName);
    if (matchM && matchM.el_kassa) {
        Object.keys(sw.revenue).forEach(ek => {
            if (matchM.el_kassa.includes(ek) || matchM.el_kassa.some(ak => ek.includes(ak))) {
                elkassaName = ek;
            }
        });
    }
}

console.log("Found Elkassa Name for", mName, ":", elkassaName);
console.log("Fetched Rev:", sw.revenue[elkassaName]);
