// Test del motore. Esecuzione: node --test test/engine.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');
const ARTICOLI = require('../articoli.js');

// Casi di riferimento del calcolatore S120 (calcolo-pl/CLAUDE.md), ricostruiti con l'archivio.
const s120 = (nCU, dmm) => ({ nome: 'S120', metodo: 'pfh', componenti: [
  { articoloId: 's120-cu320-2pn', qty: nCU }, { articoloId: dmm, qty: 3 * nCU }] });
for (const [nome, ss, nano, pl] of [
  ['12 CU in serie, senza SBC', s120(12, 's120-dmm'), 552, 'd'],
  ['12 CU in serie, SBC su tutti gli assi', s120(12, 's120-dmm-sbc'), 840, 'd'],
  ['una funzione per CU (6 assi)', s120(1, 's120-dmm'), 46, 'e'],
  ['2 CU in serie', s120(2, 's120-dmm'), 92, 'e'],
]) test(nome, () => {
  const r = E.evalSubsystem(ss, ARTICOLI, 20);
  assert.equal(r.nano, nano);
  assert.equal(r.pl, pl);
});

test('grafo del rischio', () => {
  assert.equal(E.plr('S1', 'F1', 'P1'), 'a');
  assert.equal(E.plr('S1', 'F2', 'P2'), 'c');
  assert.equal(E.plr('S2', 'F1', 'P1'), 'c');
  assert.equal(E.plr('S2', 'F2', 'P2'), 'e');
  assert.equal(E.plr('S2', null, 'P1'), null);
});

test('B10d → MTTFd e T10d (allegato C)', () => {
  const n = E.nop(220, 16, 60); // 211 200 cicli/anno
  assert.equal(n, 211200);
  assert.ok(Math.abs(E.b10dToMttfd(1e6, n) - 47.35) < 0.01);
  assert.ok(Math.abs(E.t10d(1e6, n) - 4.735) < 0.001);
});

test('livelli MTTFd e DC', () => {
  assert.deepEqual([2, 3, 10, 30, 100].map(E.mttfdLevel), ['insufficiente', 'basso', 'medio', 'alto', 'alto']);
  assert.deepEqual([0, 60, 90, 99].map(E.dcLevel), ['nessuno', 'basso', 'medio', 'alto']);
});

test('simmetrizzazione di due canali uguali restituisce lo stesso valore', () => {
  assert.ok(Math.abs(E.symmetrize(50, 50) - 50) < 1e-9);
});

test('CCF: tutte le misure fanno 100 punti', () => {
  assert.equal(E.ccfScore(Object.fromEntries(E.CCF_MEASURES.map(m => [m.id, true]))), 100);
});

// Articoli di prova con valori fittizi: servono solo a esercitare la logica.
const PROVA = [
  { id: 'fungo', codice: 'FUNGO-PROVA', b10d: 100000, fonte: 'test' },
  { id: 'cpu', codice: 'CPU-PROVA', pfh: 5, fonte: 'test' },
  { id: 'pann', codice: 'PANN-PROVA', pfh: 40, fonte: 'test' },
];
const cat3 = (extra) => ({ nome: 'Fungo', metodo: 'arch', categoria: '3', percorso: 'Fungo',
  componenti: [
    { articoloId: 'fungo', canale: 1, dc: 99, dop: 220, hop: 16, tcycle: 3600 },
    { articoloId: 'fungo', canale: 2, dc: 99, dop: 220, hop: 16, tcycle: 3600 }],
  ccf: { separazione: true, diversita: true, emc: true, ambiente: true }, ...extra });

test('architettura designata: MTTFd capped a 100 anni, DCavg, CCF', () => {
  const r = E.evalSubsystem(cat3({ pfhK1: 50 }), PROVA, 20);
  assert.equal(r.mttfd, 100);
  assert.equal(r.mttfdLevel, 'alto');
  assert.equal(r.dcavg, 99);
  assert.equal(r.ccf, 70);
  assert.deepEqual(r.errors, []);
  assert.equal(r.pl, 'e');
});

test('architettura designata senza PFH da tab. K.1: PL non determinato', () => {
  const r = E.evalSubsystem(cat3({}), PROVA, 20);
  assert.equal(r.pl, null);
  assert.ok(r.warns.some(w => w.includes('K.1')));
});

test('categoria 3 con CCF insufficiente è un errore', () => {
  const r = E.evalSubsystem(cat3({ ccf: { emc: true }, pfhK1: 50 }), PROVA, 20);
  assert.ok(r.errors.some(e => e.includes('CCF')));
});

test('funzione: percorsi alternativi, vale il peggiore, confronto con PLr', () => {
  const fn = { nome: 'Emergenza', S: 'S2', F: 'F1', P: 'P2', sottosistemi: [
    cat3({ pfhK1: 50, ruolo: 'rilevamento' }),
    { nome: 'Pannello', ruolo: 'rilevamento', metodo: 'pfh', percorso: 'Pannello', componenti: [{ articoloId: 'pann' }] },
    { nome: 'F-CPU', ruolo: 'logica', metodo: 'pfh', componenti: [{ articoloId: 'cpu' }] },
    { nome: 'Azionamenti', ruolo: 'attuazione', metodo: 'pfh', componenti: [{ articoloId: 's120-cu320-2pn', qty: 12 }, { articoloId: 's120-dmm', qty: 36 }] },
  ] };
  const r = E.evalFunction(fn, [...PROVA, ...ARTICOLI], 20);
  assert.equal(r.plr, 'd');
  assert.deepEqual(r.paths.map(p => [p.nome, p.nano]), [['Fungo', 607], ['Pannello', 597]]);
  assert.equal(r.worst.nome, 'Fungo');
  assert.equal(r.pl, 'd');
  assert.equal(r.ok, true);
});

test('funzione senza rilevamento e logica non è soddisfatta', () => {
  const r = E.evalFunction({ S: 'S1', F: 'F1', P: 'P1', sottosistemi: [
    { nome: 'Azionamenti', ruolo: 'attuazione', metodo: 'pfh', componenti: [{ articoloId: 's120-cu320-2pn' }] }] }, ARTICOLI, 20);
  assert.equal(r.pl, 'e');
  assert.equal(r.ok, false);
});
