/**
 * routes/uploads.js
 * Маршруты: POST /api/upload, POST /api/vision
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const PATHS = require('./paths');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';
const OPENAI_URL     = 'https://openrouter.ai/api/v1/chat/completions';

// ──  Telegram-уведомления при проблемах с API  ──────────────────────────────
const TG_TOKEN  = process.env.TG_TOKEN  || '8264809973:AAGI-YhU8LItlRULVgTfk44y30pTR85Vft4';
const TG_CHAT   = process.env.TG_CHAT_ID || '476578323';

let _lastApiAlert = 0; // throttle: не чаще раза в 5 минут

function sendTgAlert(text) {
  const now = Date.now();
  if (now - _lastApiAlert < 5 * 60 * 1000) return; // throttle
  _lastApiAlert = now;

  const body = JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML' });
  const opts = {
    hostname: 'api.telegram.org',
    path: `/bot${TG_TOKEN}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  };
  const req = https.request(opts, (res) => {
    res.resume(); // drain
  });
  req.on('error', (e) => console.error('[TG alert] error:', e.message));
  req.write(body);
  req.end();
}

// Определяем, является ли ошибка API проблемой с ключом/балансом
function isApiKeyError(status, body) {
  if ([401, 402, 403].includes(status)) return true;
  const msg = (typeof body === 'string' ? body : JSON.stringify(body)).toLowerCase();
  return msg.includes('insufficient') || msg.includes('balance') || msg.includes('quota')
    || msg.includes('invalid api key') || msg.includes('no auth') || msg.includes('credit');
}

const ZONE_RULES = {
  reklama: 'Проверь, что наружная реклама попала в кадр, выглядит целой и чистой.',
  forma:   'Проверь, что мастера, видимые в кадре, одеты в фирменную униформу и в закрытую обувь.',
  kreslo:  'Проверь, что на барберском кресле аккуратно лежит пеньюар или стрижётся клиент (тогда пеньюар на кресле не обязателен).',
  tv:      'Проверь, что телевизор в зале включен и на нём транслируется контент (не черный выключенный экран).',
  shkaf:   'Проверь шкафы и полки: на них не должно быть видимых волос и раскиданных личных вещей персонала (сумок, курток, мятых полотенец, скомканных тряпок и т.д.).',
  moyka:   'Проверь зону мойки головы: раковина прозрачная/сухая, на ней и вокруг неё не висят/не валяются тряпки, полотенца или инструменты.',
};

// POST /api/upload — сохранить фото из base64
function handleUpload(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      if (!data.base64) throw new Error('No base64 data');
      const base64Data = data.base64.replace(/^data:image\/\w+;base64,/, '');
      const filename = `photo_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
      fs.writeFileSync(path.join(PATHS.uploadsDir, filename), base64Data, 'base64');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ url: `/manager_uploads/${filename}` }));
    } catch (e) {
      console.error('[Upload] error:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

// POST /api/vision — проверить фото через OpenAI Vision
async function handleVision(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { images, zoneId } = JSON.parse(body);
      const zoneRule = ZONE_RULES[zoneId] || 'Оцени общий порядок.';

      const fetchClient = typeof fetch !== 'undefined' ? fetch : require('node-fetch');

      const payload = {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Ты — непреклонный ИИ-аудитор барбершопа. Оцениваешь фотографию от менеджера. Твоя главная конкретная задача: ${zoneRule} Если базовое правило нарушено, фото размытое, или в кадре видимый ужасный бардак (волосы комками, рассыпан мусор) - бракуй фото. Отвечай строго JSON-объектом: {"approved": boolean, "comment": "Почему не одобрено или похвала, если всё супер"}.`,
          },
          {
            role: 'user',
            content: images.map(img => ({ type: 'image_url', image_url: { url: img } })),
          },
        ],
        max_tokens: 300,
        response_format: { type: 'json_object' },
      };

      const response = await fetchClient(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'HTTP-Referer': 'https://app.grome.pro',
          'X-Title': 'Grome Dashboard',
        },
        body: JSON.stringify(payload),
      });

      const resultMsg = await response.json();
      let resultData;

      // ── Проверяем ошибку ключа/баланса ──────────────────────────────────
      if (isApiKeyError(response.status, resultMsg)) {
        const errDetail = resultMsg?.error?.message || `HTTP ${response.status}`;
        console.error('[Vision] API key/balance error:', errDetail);
        sendTgAlert(
          `🔴 <b>Grome Dashboard — ошибка API Vision</b>\n\n` +
          `Фотопроверка менеджера не работает.\n` +
          `Причина: <code>${errDetail}</code>\n\n` +
          `Проверьте баланс OpenRouter: https://openrouter.ai/account`
        );
        res.writeHead(402, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'недостаточно баланса API', api_error: true }));
        return;
      }

      if (resultMsg.choices && resultMsg.choices[0]) {
        resultData = JSON.parse(resultMsg.choices[0].message.content);
      } else if (resultMsg.error) {
        // Дополнительная проверка в теле ответа
        if (isApiKeyError(200, resultMsg.error.message || '')) {
          sendTgAlert(
            `🔴 <b>Grome Dashboard — ошибка API Vision</b>\n\n` +
            `Фотопроверка менеджера не работает.\n` +
            `Причина: <code>${resultMsg.error.message}</code>`
          );
          res.writeHead(402, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'недостаточно баланса API', api_error: true }));
          return;
        }
        throw new Error(resultMsg.error.message);
      } else {
        throw new Error(JSON.stringify(resultMsg));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(resultData));
    } catch (e) {
      console.error('[Vision] error:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message || 'Vision check failed' }));
    }
  });
}

module.exports = { handleUpload, handleVision };
