require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.VIDEO_AUDIT_BASE_URL || 'http://127.0.0.1:8080';
const USER_KEY = process.env.VIDEO_AUDIT_USER_KEY || '';
const INTERNAL_TOKEN = process.env.VIDEO_AUDIT_INTERNAL_TOKEN || '';
const LOGIN = process.env.IVIDEON_LOGIN || '';
const PASSWORD = process.env.IVIDEON_PASSWORD || '';
const INTERVAL_MIN = Math.max(1, Number(process.env.IVIDEON_CAPTURE_INTERVAL_MIN || 30));
const HEADLESS = process.env.IVIDEON_HEADLESS !== 'false';
const STATE_PATH = process.env.IVIDEON_STATE_PATH || path.join(__dirname, 'video_audit_data', 'ivideon-storage-state.json');
const CAMERA_CONFIG_PATH = process.env.IVIDEON_CAMERA_CONFIG || path.join(__dirname, 'ivideon_cameras.json');

function log(...args) {
  console.log(new Date().toISOString(), '[ivideon-worker]', ...args);
}

function readCameraConfig() {
  const raw = process.env.IVIDEON_CAMERAS_JSON || (fs.existsSync(CAMERA_CONFIG_PATH) ? fs.readFileSync(CAMERA_CONFIG_PATH, 'utf8') : '');
  if (!raw.trim()) return [];
  const value = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error('IVIDEON_CAMERAS_JSON must be an array');
  return value;
}

async function api(pathname, options = {}) {
  const headers = new Headers(options.headers || {});
  if (INTERNAL_TOKEN) headers.set('X-Video-Audit-Internal-Token', INTERNAL_TOKEN);
  if (USER_KEY) headers.set('X-User-Key', USER_KEY);
  if (options.json) {
    headers.set('Content-Type', 'application/json; charset=utf-8');
    options.body = JSON.stringify(options.json);
  }
  const res = await fetch(`${BASE_URL}/api/video-audit${pathname}`, { ...options, headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function ensureLogin(page) {
  await page.goto('https://app.ivideon.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3000);

  const hasLoginForm = await page.locator('input[type="email"], input[name="email"], input[name="login"]').first().isVisible().catch(() => false);
  if (!hasLoginForm) return;
  if (!LOGIN || !PASSWORD) throw new Error('IVIDEON_LOGIN and IVIDEON_PASSWORD are required for first login');

  const loginInput = page.locator('input[type="email"], input[name="email"], input[name="login"], input[type="text"]').first();
  const passInput = page.locator('input[type="password"]').first();
  await loginInput.fill(LOGIN);
  await passInput.fill(PASSWORD);
  await page.locator('button[type="submit"], input[type="submit"], button').first().click();
  await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
}

async function discoverCameraUrls(page) {
  const configured = readCameraConfig();
  if (configured.length) return configured;

  await page.goto('https://app.ivideon.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(6000);
  const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => ({
    name: (node.textContent || '').trim(),
    url: node.href,
  })));

  const seen = new Set();
  return links
    .filter(item => /camera|device|archive|live|video/i.test(item.url + ' ' + item.name))
    .filter(item => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .slice(0, 100)
    .map((item, index) => ({
      name: item.name || `Ivideon camera ${index + 1}`,
      url: item.url,
    }));
}

async function screenshotCamera(context, camera, index) {
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  try {
    await page.goto(camera.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(Number(camera.wait_ms || process.env.IVIDEON_CAMERA_WAIT_MS || 8000));

    const locator = camera.selector ? page.locator(camera.selector).first() : page.locator('video, canvas, img').first();
    const visible = await locator.isVisible().catch(() => false);
    const buffer = visible
      ? await locator.screenshot({ type: 'jpeg', quality: 88 })
      : await page.screenshot({ type: 'jpeg', quality: 88, fullPage: false });

    const candidate = await api('/integrations/ivideon/candidate', {
      method: 'POST',
      json: {
        location: camera.location || camera.branch || null,
        branch_id: camera.branch_id || null,
        camera_id: camera.camera_id || null,
        camera_name: camera.name || `Ivideon camera ${index + 1}`,
        provider_camera_id: camera.provider_camera_id || null,
        stream_ref: camera.url,
        ivideon_camera_url: camera.url,
        source_time: new Date().toISOString(),
        predicted_type: camera.predicted_type || null,
        predicted_confidence: null,
        comment: camera.comment || 'Автоматический скриншот Ivideon для разметки',
        meta: { source: 'ivideon_screenshot_worker' },
      },
    });

    await fetch(`${BASE_URL}/api/video-audit/cases/${candidate.id}/evidence`, {
      method: 'POST',
      headers: {
        ...(INTERNAL_TOKEN ? { 'X-Video-Audit-Internal-Token': INTERNAL_TOKEN } : {}),
        ...(USER_KEY ? { 'X-User-Key': USER_KEY } : {}),
        'Content-Type': 'image/jpeg',
        'X-Filename': encodeURIComponent(`${safeName(camera.name || `camera-${index + 1}`)}.jpg`),
        'X-Captured-At': new Date().toISOString(),
      },
      body: buffer,
    }).then(async res => {
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    });

    log('sent screenshot', camera.name || camera.url, candidate.id);
  } finally {
    await page.close().catch(() => {});
  }
}

function safeName(value) {
  return String(value || 'camera').replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(0, 80);
}

async function runOnce() {
  if (!USER_KEY && !INTERNAL_TOKEN) throw new Error('VIDEO_AUDIT_INTERNAL_TOKEN or VIDEO_AUDIT_USER_KEY is required so the worker can write to protected API');

  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  const browser = await chromium.launch({ headless: HEADLESS, args: ['--no-sandbox'] });
  const context = await browser.newContext(fs.existsSync(STATE_PATH) ? { storageState: STATE_PATH } : {});
  const page = await context.newPage();

  try {
    await ensureLogin(page);
    await context.storageState({ path: STATE_PATH });
    const cameras = await discoverCameraUrls(page);
    log('cameras found', cameras.length);
    for (let i = 0; i < cameras.length; i += 1) {
      await screenshotCamera(context, cameras[i], i);
    }
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

async function loop() {
  while (true) {
    try {
      await runOnce();
    } catch (error) {
      console.error(new Date().toISOString(), '[ivideon-worker] error', error.message);
    }
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MIN * 60 * 1000));
  }
}

if (process.argv.includes('--once')) {
  runOnce().catch(error => {
    console.error(error);
    process.exit(1);
  });
} else {
  loop();
}
