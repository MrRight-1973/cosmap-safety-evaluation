// Test di regressione: estrae <script id="calc"> da calcolo-pl.html e controlla
// i quattro casi di riferimento di CLAUDE.md. Esecuzione: node --test test/regressione.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'calcolo-pl.html'), 'utf8');
const m = html.match(/<script id="calc">([\s\S]*?)<\/script>/);
assert.ok(m, 'blocco <script id="calc"> non trovato');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(m[1], sandbox);
const { evaluate, toPL } = sandbox.module.exports;

const impianto = { nCU: 12, nDMM: 3, nSMM: 0, extraCU: 0, others: [], paths: [] };
const casi = [
  { nome: '12 CU in serie, senza SBC', c: { sbc: false, mode: 'serie' }, nano: 552, pl: 'd' },
  { nome: '12 CU in serie, SBC su tutti gli assi', c: { sbc: true, mode: 'serie' }, nano: 840, pl: 'd' },
  { nome: 'una funzione per CU (6 assi)', c: { sbc: false, mode: 'sep' }, nano: 46, pl: 'e' },
  { nome: '2 CU in serie', c: { sbc: false, mode: 'serie', nCU: 2 }, nano: 92, pl: 'e' },
];

for (const k of casi) {
  test(k.nome, () => {
    const r = evaluate({ ...impianto, ...k.c });
    assert.equal(r.act.total, k.nano);
    assert.equal(toPL(r.act.total * 1e-9).pl, k.pl);
  });
}

test('percorsi: vale il peggiore, gli elementi comuni si sommano a tutti', () => {
  const r = evaluate({ ...impianto, sbc: false, mode: 'serie', cpu: 3, bus: 1,
    paths: [{ name: 'A', sensor: 10, input: 5 }, { name: 'B', sensor: 50, input: 0 }] });
  assert.deepEqual(r.paths.map(p => p.nano), [571, 606]);
  assert.equal(r.worst.name, 'B');
});

test('soglie PL: il limite superiore è escluso', () => {
  assert.equal(toPL(9.99e-8).pl, 'e');
  assert.equal(toPL(1e-7).pl, 'd');
  assert.equal(toPL(1e-6).pl, 'c');
  assert.equal(toPL(1e-4).pl, 'nessuno');
});
