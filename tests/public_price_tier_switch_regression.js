const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const pricing = html.match(/<section[^>]+id="pricing"[\s\S]*?<\/section>/);
assert.ok(pricing, 'публичный прайс найден');

assert.match(pricing[0], /data-price-tier="barber"[^>]*aria-pressed="true"/, 'по умолчанию выбран барбер');
assert.match(pricing[0], /data-price-tier="pro"[^>]*aria-pressed="false"/, 'доступен выбор про-барбера');
assert.match(pricing[0], /data-price-barber="900"\s+data-price-pro="1100"/, 'стрижка имеет две подтверждённые цены');
assert.match(pricing[0], /data-price-barber="1700"\s+data-price-pro="2000"/, 'комплекс про-барбера равен стрижке и моделированию бороды');
assert.match(pricing[0], /data-price-barber="800"\s+data-price-pro="900"/, 'моделирование бороды имеет две подтверждённые цены');
assert.match(pricing[0], /data-price-barber="600"\s+data-price-pro="800"/, 'стрижка машинкой имеет две подтверждённые цены');
assert.strictEqual((pricing[0].match(/data-price-barber=/g) || []).length, 4, 'в прайс не добавлены новые позиции');
assert.ok(!/>от\s*\d+\s*₽</.test(pricing[0]), 'в прайсе нет стартовых цен');
assert.match(pricing[0], /setPriceTier\(/, 'переключатель меняет цены через публичный сценарий');

console.log('public_price_tier_switch_regression: OK');
