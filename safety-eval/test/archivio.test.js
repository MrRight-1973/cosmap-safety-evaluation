// node --test safety-eval/test/archivio.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { unisci, conDefault, segnaUtilizzati, perProduttore, filtra } = require('../archivio.js');

const art = (id, o = {}) => ({ id, codice: id.toUpperCase(), descrizione: 'desc ' + id, produttore: 'P', tipo: 'sensore', pfh: null, b10d: null, mttfd: null, fonte: 'doc', verificato: false, ...o });

test('unisci: nuovi, invariati, aggiornati', () => {
  const archivio = [art('a', { pfh: 10, verificato: true, note: 'mia nota' }), art('b', { b10d: 1e6, verificato: true })];
  const r = unisci(archivio, [art('a', { pfh: 10 }), art('b', { b10d: 2e6, note: 'import' }), art('c')]);
  assert.deepEqual([r.nuovi, r.aggiornati, r.invariati], [1, 1, 1]);
  assert.equal(r.articoli.length, 3);
  assert.equal(r.articoli[0].verificato, true, 'invariato resta verificato');
  const b = r.articoli.find(x => x.id === 'b');
  assert.equal(b.b10d, 2e6);
  assert.equal(b.verificato, false, 'valore cambiato → da verificare');
  assert.equal(archivio[1].b10d, 1e6, 'archivio originale non modificato');
});

test('unisci: cambia solo la fonte → aggiornato ma resta verificato, note utente conservate', () => {
  const r = unisci([art('a', { pfh: 5, verificato: true, note: 'mia' })], [art('a', { pfh: 5, fonte: 'nuova', note: 'import' })]);
  assert.equal(r.aggiornati, 1);
  assert.equal(r.articoli[0].verificato, true);
  assert.equal(r.articoli[0].note, 'mia');
  assert.equal(r.articoli[0].fonte, 'nuova');
});

test('conDefault aggiunge solo i predefiniti mancanti', () => {
  const r = conDefault([art('a', { pfh: 99 })], [art('a', { pfh: 1 }), art('d')]);
  assert.deepEqual(r.map(x => x.id), ['a', 'd']);
  assert.equal(r[0].pfh, 99);
});

test('perProduttore e filtra', () => {
  const A = [art('a', { produttore: 'Pizzato', libreria: 'L1', verificato: true }), art('b', { produttore: 'Pizzato', tipo: 'logica', fonte: '' }), art('c', { produttore: 'Siemens', tipo: 'attuatore', descrizione: 'Motor Module' })];
  const p = perProduttore(A);
  assert.deepEqual(p.map(x => x.produttore), ['Pizzato', 'Siemens']);
  assert.deepEqual({ ...p[0], tipi: { ...p[0].tipi } }, { produttore: 'Pizzato', articoli: 2, daVerificare: 1, senzaFonte: 1, utilizzati: 0, librerie: ['L1'], tipi: { sensore: 1, logica: 1 } });
  assert.deepEqual(filtra(A, { produttore: 'Pizzato' }).map(x => x.id), ['a', 'b']);
  assert.deepEqual(filtra(A, { tipo: 'logica' }).map(x => x.id), ['b']);
  assert.deepEqual(filtra(A, { daVerificare: true }).map(x => x.id), ['b', 'c']);
  assert.deepEqual(filtra(A, { testo: 'motor siem' }).map(x => x.id), ['c']);
});

test('unisci: articolo invariato che ora ha un\'immagine la riceve', () => {
  const r = unisci([art('a', { pfh: 5, verificato: true })], [art('a', { pfh: 5, immagine: 'x/a.png' })]);
  assert.equal(r.invariati, 1);
  assert.equal(r.articoli[0].immagine, 'x/a.png');
  assert.equal(r.articoli[0].verificato, true);
});

test('articoli già utilizzati: segnati con la data, filtrabili, contati per costruttore, conservati dagli import', () => {
  const A = [art('a'), art('b', { produttore: 'Q' }), art('c')];
  assert.equal(segnaUtilizzati(A, new Set(['a', 'b']), '2026-10-17'), 2);
  assert.equal(segnaUtilizzati(A, new Set(['a', 'b']), '2026-10-17'), 0);
  assert.deepEqual(filtra(A, { utilizzati: true }).map(a => a.id), ['a', 'b']);
  assert.deepEqual(filtra(A, { utilizzati: true, tipo: 'sensore', produttore: 'Q' }).map(a => a.id), ['b']);
  assert.equal(perProduttore(A).find(r => r.produttore === 'P').utilizzati, 1);
  const { articoli } = unisci(A, [{ ...art('a'), pfh: 5 }]);
  assert.equal(articoli[0].utilizzato, '2026-10-17');
});
