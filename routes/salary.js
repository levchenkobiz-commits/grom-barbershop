/**
 * routes/salary.js
 * Маршрут: POST /api/fetch_salary
 *
 * Использует общий Playwright-скрейпер El-Kassa.
 */

function handlePost(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { start, end } = JSON.parse(body);
      if (!start || !end) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Missing start or end' }));
      }
      const scraper = require('../elkassa_scraper');
      const data = await scraper.fetchSalaryData(start, end);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (e) {
      console.error('[Salary] fetch error:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Scraper error: ' + e.message }));
    }
  });
}

module.exports = { handlePost };
