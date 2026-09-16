const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const pricing = html.match(/<section[^>]+id="pricing"[\s\S]*?<\/section>/);
assert.ok(pricing, 'публичный прайс найден');

for (const [service, price] of [
  ['Мужская стрижка', '900'],
  ['Стрижка + Борода', '1700'],
  ['Моделирование бороды', '800'],
  ['Стрижка машинкой', '600'],
]) {
  const escapedService = service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const row = pricing[0].match(new RegExp(`<div class="price-row[^\"]*" data-price-barber="${price}" data-price-pro="\\d+">[\\s\\S]*?<h3>${escapedService}<\\/h3>[\\s\\S]*?<div class="price-amount"[^>]*>([\\s\\S]*?)<\\/div>`));
  assert.ok(row, `${service}: строка прайса найдена`);
  assert.strictEqual(row[1].trim(), `${price} ₽`, `${service}: показана точная цена барбера`);
}

assert.ok(!/>от\s*\d+\s*₽</.test(pricing[0]), 'в прайсе не осталось стартовых цен');
assert.ok(!/Стрижка \+ Борода<\/h3>\s*<span class="tag">Выгода<\/span>/.test(pricing[0]), 'у пары стрижка и борода нет ложной скидки');
console.log('public_haircut_price_regression: OK');
