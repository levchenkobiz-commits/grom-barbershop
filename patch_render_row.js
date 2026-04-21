const fs = require('fs');

let js = fs.readFileSync('mainscript.js', 'utf8');

js = js.replace(/<td style="font-weight:700;">\$\{r\.location\}<\/td>/g, '<td data-label="САЛОН" style="font-weight:700;">${r.location}</td>');
js = js.replace(/<td style="font-size:14px;">\$\{r\.clientTime \|\| \'-\'\}<\/td>/g, '<td data-label="ВРЕМЯ" style="font-size:14px;">${r.clientTime || \'-\'}</td>');
js = js.replace(/<td style="font-size:12px; opacity:0\.7">\$\{r\.notes \|\| \'-\'\}<\/td>/g, '<td data-label="РАБОТА" style="font-size:12px; opacity:0.7">${r.notes || \'-\'}</td>');

// Some entries didn't match perfectly, so let's use a very broad regex for renderRow's tr block
const rx = /return `<tr>([\s\S]*?)<\/tr>`;/g;
js = js.replace(rx, function(match, p1) {
    if(match.includes('r.violation')) {
        let block = match;
        // make sure all tds have data-label
        if(!block.includes('data-label="МАСТЕР"')) block = block.replace(/<td(.*?)><b>\$\{r\.barber\}<\/b>/, '<td data-label="МАСТЕР"$1><b>${r.barber}</b>');
        if(!block.includes('data-label="НАРУШЕНИЕ"')) block = block.replace(/<td(.*?)><span class="badge-status/, '<td data-label="НАРУШЕНИЕ"$1><span class="badge-status');
        if(!block.includes('data-label="ДАТА ПРОСМ."')) block = block.replace(/<td(.*?)>\s*\$\{dayjs\(r\.createdAt\)/, '<td data-label="ДАТА ПРОСМ."$1>\n                            ${dayjs(r.createdAt)');
        if(!block.includes('data-label="САЛОН"')) block = block.replace(/<td(.*?)>\$\{r\.location\}<\/td>/, '<td data-label="САЛОН"$1>${r.location}</td>');
        if(!block.includes('data-label="ВРЕМЯ"')) block = block.replace(/<td(.*?)>\$\{r\.clientTime \|\| '-'\}<\/td>/, '<td data-label="ВРЕМЯ"$1>${r.clientTime || \'-\'}</td>');
        if(!block.includes('data-label="РАБОТА"')) block = block.replace(/<td(.*?)>\$\{r\.notes \|\| '-'\}<\/td>/, '<td data-label="РАБОТА"$1>${r.notes || \'-\'}</td>');
        return block;
    }
    return match;
});

fs.writeFileSync('mainscript.js', js, 'utf8');
console.log('Fixed renderRow');
