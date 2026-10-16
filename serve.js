// Serve la web app su http://localhost:8080 (porta diversa con PORT=xxxx). Nessuna dipendenza.
// L'archivio articoli viene salvato in data/archivio-articoli.json (cartella diversa con DATA_DIR=...).
// Esecuzione: npm start
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'safety-eval');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const ARCHIVIO = path.join(DATA_DIR, 'archivio-articoli.json');
const PORT = Number(process.env.PORT) || 8080;
const MAX_BODY = 50 * 1024 * 1024;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.md': 'text/plain' };

function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function archivio(req, res) {
  if (req.method === 'GET') {
    fs.readFile(ARCHIVIO, 'utf8', (err, text) => {
      if (err && err.code === 'ENOENT') return json(res, 200, { articoli: null, file: ARCHIVIO });
      if (err) return json(res, 500, { errore: err.message });
      try { json(res, 200, { articoli: JSON.parse(text), file: ARCHIVIO }); } catch (e) { json(res, 500, { errore: `${ARCHIVIO} non è un JSON valido: ${e.message}` }); }
    });
    return;
  }
  if (req.method !== 'PUT') return json(res, 405, { errore: 'metodo non ammesso' });
  const chunks = [];
  let size = 0;
  req.on('data', c => { size += c.length; if (size > MAX_BODY) req.destroy(); else chunks.push(c); });
  req.on('end', () => {
    let articoli;
    try { articoli = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { return json(res, 400, { errore: 'JSON non valido' }); }
    if (!Array.isArray(articoli) || articoli.some(a => !a || typeof a.id !== 'string')) return json(res, 400, { errore: 'serve un elenco di articoli con id' });
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      // scrittura atomica, con copia della versione precedente
      if (fs.existsSync(ARCHIVIO)) fs.copyFileSync(ARCHIVIO, ARCHIVIO.replace(/\.json$/, '.bak.json'));
      fs.writeFileSync(ARCHIVIO + '.tmp', JSON.stringify(articoli, null, 1));
      fs.renameSync(ARCHIVIO + '.tmp', ARCHIVIO);
      json(res, 200, { salvati: articoli.length, file: ARCHIVIO });
    } catch (e) { json(res, 500, { errore: e.message }); }
  });
}

http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (rel === '/api/articoli') return archivio(req, res);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Non trovato'); return; }
    res.writeHead(200, { 'Content-Type': (TYPES[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`Safety evaluation su http://localhost:${PORT} · archivio in ${ARCHIVIO}`));
