const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const old = 'onclick="this.innerText=\'Загрузка...\'; renderSalaryTable\\(\\)\\.finally\\(\\(\\) => \\{ this.innerText=\'Рассчитать\'; \\}\\)"';
const next = 'onclick="let t=this.innerHTML; this.innerHTML=`<svg style=\'animation: spin 1s linear infinite; margin-right:8px; display:inline-block; vertical-align:middle;\' width=\'14\' height=\'14\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><line x1=\'12\' y1=\'2\' x2=\'12\' y2=\'6\'></line><line x1=\'12\' y1=\'18\' x2=\'12\' y2=\'22\'></line><line x1=\'4.93\' y1=\'4.93\' x2=\'7.76\' y2=\'7.76\'></line><line x1=\'16.24\' y1=\'16.24\' x2=\'19.07\' y2=\'19.07\'></line><line x1=\'2\' y1=\'12\' x2=\'6\' y2=\'12\'></line><line x1=\'18\' y1=\'12\' x2=\'22\' y2=\'12\'></line><line x1=\'4.93\' y1=\'19.07\' x2=\'7.76\' y2=\'16.24\'></line><line x1=\'16.24\' y1=\'7.76\' x2=\'19.07\' y2=\'4.93\'></line></svg> Считаю...`; renderSalaryTable().finally(() => { this.innerHTML=t; })"';

const regex = new RegExp('onclick="this\\.innerText=\'Загрузка\\.\\.\\.\';\\s*renderSalaryTable\\(\\)\\.finally\\(\\(\\) => \\{ this\\.innerText=\'Рассчитать\'; \\}\\)"');

html = html.replace(regex, next);

fs.writeFileSync('index.html', html);
console.log("Added spinner animation to salary button!");
