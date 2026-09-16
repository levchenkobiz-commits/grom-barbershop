const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const pricing = html.match(/<section[^>]+id="pricing"[\s\S]*?<\/section>/);
assert.ok(pricing, 'публичный прайс найден');

for (const [service, price] of [
  ['Мужская стрижка', '900'],
  ['Стрижка + Борода', '1600'],
  ['Стрижка машинкой', '600'],
]) {
  const escapedService = service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const row = pricing[0].match(new RegExp(`<h3>${escapedService}<\\/h3>[\\s\\S]*?<div class="price-amount">([\\s\\S]*?)<\\/div>`));
  assert.ok(row, `${service}: строка прайса найдена`);
  assert.strictEqual(row[1].trim(), `от ${price} ₽`, `${service}: цена показана как стартовая`);
}

assert.match(pricing[0], /<h3>Моделирование бороды<\/h3>[\s\S]*?<div class="price-amount">800 ₽<\/div>/, 'не связанная со стрижкой услуга не меняется');
console.log('public_haircut_price_prefix_regression: OK');
