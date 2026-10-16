// Crea safety-eval.html: un unico file con gli script incorporati, da aprire con doppio clic.
// Esecuzione: node build.js
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
let html = read('index.html');
for (const f of ['engine.js', 'articoli.js', 'archivio.js', 'sistema.js', 'vdma.js']) {
  const tag = `<script src="${f}"></script>`;
  if (!html.includes(tag)) throw new Error(`manca ${tag} in index.html`);
  html = html.replace(tag, () => `<script>\n${read(f).replace(/<\/script/gi, '<\\/script')}\n</script>`);
}
fs.writeFileSync(path.join(__dirname, 'safety-eval.html'), html);
console.log('scritto safety-eval.html');
