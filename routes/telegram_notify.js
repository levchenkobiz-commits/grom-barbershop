const fs = require('fs');
const https = require('https');
const dns = require('dns');
const path = require('path');
const { SocksProxyAgent } = require('socks-proxy-agent');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8264809973:AAGI-YhU8LItlRULVgTfk44y30pTR85Vft4';
const OWNER_CHAT_ID = process.env.TELEGRAM_OWNER_CHAT_ID || '476578323';
const telegramAgent = process.env.TELEGRAM_PROXY
  ? new SocksProxyAgent(process.env.TELEGRAM_PROXY)
  : new https.Agent({ keepAlive: true, lookup: (hostname, options, callback) => {
      if (typeof options === 'function') { callback = options; options = {}; }
      dns.lookup(hostname, { ...options, family: 6 }, callback);
    }});

function sendMessageOnce(text, options = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ chat_id: OWNER_CHAT_ID, text, parse_mode: 'HTML', ...options });
    const request = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TOKEN}/sendMessage`,
      method: 'POST',
      agent: telegramAgent,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 15000
    }, response => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) resolve();
        else reject(new Error(`Telegram ${response.statusCode}: ${data.slice(0, 200)}`));
      });
    });
    request.on('timeout', () => request.destroy(new Error('Telegram timeout')));
    request.on('error', reject);
    request.end(body);
  });
}

function sendPhotoOnce(filePath, caption) {
  return new Promise((resolve, reject) => {
    const boundary = `----grome-${Date.now()}`;
    const file = fs.readFileSync(filePath);
    const head = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="chat_id"\r\n\r\n${OWNER_CHAT_ID}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="photo"; filename="${path.basename(filePath)}"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n`
    );
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([head, file, tail]);
    const request = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TOKEN}/sendPhoto`,
      method: 'POST',
      agent: telegramAgent,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      },
      timeout: 15000
    }, response => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) resolve();
        else reject(new Error(`Telegram ${response.statusCode}: ${data.slice(0, 200)}`));
      });
    });
    request.on('timeout', () => request.destroy(new Error('Telegram timeout')));
    request.on('error', reject);
    request.end(body);
  });
}

async function sendOwnerPhoto(filePath, caption) {
  let lastError;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      await sendPhotoOnce(filePath, caption);
      return;
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, Math.min(10000, attempt * 1500)));
    }
  }
  throw lastError;
}

async function sendOwnerMessage(text, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      await sendMessageOnce(text, options);
      return;
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, Math.min(10000, attempt * 1500)));
    }
  }
  throw lastError;
}

module.exports = { sendOwnerPhoto, sendOwnerMessage };
