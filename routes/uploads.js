/**
 * routes/uploads.js
 * Маршруты: POST /api/upload, POST /api/vision
 */

const fs    = require('fs');
const path  = require('path');
const PATHS = require('./paths');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-viwZET4irKbhBSTEQ2n9D1j49Nw1FfkK';
const OPENAI_URL     = 'https://api.proxyapi.ru/openai/v1/chat/completions';

const ZONE_RULES = {
  reklama: 'Проверь, что наружная реклама попала в кадр, выглядит целой и чистой.',
  forma:   'Проверь, что мастера, видимые в кадре, одеты в фирменную униформу и в закрытую обувь.',
  kreslo:  'Проверь, что барберское кресло опущено, выровнено, развёрнуто лицом ко входу (а не к зеркалу), и на нём находится сложенный пеньюар.',
  tv:      'Проверь, что телевизор в зале включен и на нём транслируется контент (не черный выключенный экран).',
  shkaf:   'Проверь шкафы и полки: на них не должно быть видимых волос и раскиданных личных вещей персонала (сумок, курток и т.д.).',
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
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const resultMsg = await response.json();
      let resultData;

      if (resultMsg.choices && resultMsg.choices[0]) {
        resultData = JSON.parse(resultMsg.choices[0].message.content);
      } else if (resultMsg.error) {
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
