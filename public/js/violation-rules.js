(function exposeViolationRules(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VIOLATION_RULES = api;
})(typeof window !== 'undefined' ? window : globalThis, function createViolationRules() {
  const aliases = Object.freeze({
    'не обработан инструмент': 'Не обработал инструмент',
    '🧼 не обработал инструмент': 'Не обработал инструмент',
    'грязное место': 'Грязное рабочее место',
    '🪞 не показал зеркало заднего вида': 'Не показал зеркало заднего вида',
    '⚠️ про акцию не сказал': 'Про акцию не сказал',
    '📝 другое (в коммент.)': 'Другое',
    '📱 телефон при клиенте': 'Телефон при клиенте',
    '✅ замечаний нет': 'Замечаний нет',
    'замеч��ний нет': 'Замечаний нет',
    'неоплаченная стрижка': 'Услуга не проведена через терминал',
    'мастер не вышел': 'Невыход',
    'не вышел на смену': 'Невыход',
  });

  function normalizedKey(value) {
    return String(value || '').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function canonicalizeViolation(value) {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    return aliases[normalizedKey(clean)] || clean;
  }

  function splitViolations(value) {
    const values = Array.isArray(value) ? value : String(value || '').split(',');
    return values.map(canonicalizeViolation).filter(Boolean);
  }

  function canonicalizeViolationList(value) {
    const values = splitViolations(value);
    const realViolations = values.filter(item => !isNoViolation(item));
    return (realViolations.length ? realViolations : values.slice(0, 1)).join(', ');
  }

  function canonicalizeHandbook(handbook) {
    const result = {};
    for (const [rawKey, rawValue] of Object.entries(handbook || {})) {
      const key = canonicalizeViolation(rawKey);
      const value = Number(rawValue);
      if (!key || !Number.isFinite(value) || value < 0) throw new Error(`Некорректная строка штрафного листа: ${rawKey}`);
      if (Object.prototype.hasOwnProperty.call(result, key) && result[key] !== value) {
        throw new Error(`Конфликт сумм для алиаса: ${rawKey} → ${key}`);
      }
      result[key] = value;
    }
    return result;
  }

  function isNoViolation(value) {
    const canonical = canonicalizeViolation(value);
    return canonical === 'Замечаний нет' || normalizedKey(canonical) === 'нет нарушений';
  }

  function isZoneExcludedViolation(value) {
    const text = normalizedKey(canonicalizeViolation(value));
    return text.includes('опоздал') || text === 'отказ клиенту';
  }

  return Object.freeze({
    aliases,
    canonicalizeViolation,
    canonicalizeViolationList,
    canonicalizeHandbook,
    splitViolations,
    isNoViolation,
    isZoneExcludedViolation,
  });
});
