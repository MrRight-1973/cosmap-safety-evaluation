// node --test safety-eval/test/validazione.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../validazione.js');

const ss = (id, ruolo, extra = {}) => ({ id, nome: id, ruolo, percorso: '', metodo: 'pfh', componenti: [], ...extra });

test('prove standard: funzionale, tempo, reset, poi un controllo per blocco', () => {
  const f = { sottosistemi: [ss('Fungo', 'rilevamento', { metodo: 'arch', categoria: '4' }), ss('F-CPU', 'logica'), ss('Drive', 'attuazione', { metodo: 'arch', categoria: '1' })] };
  const keys = V.proveAuto(f).map(p => p.key);
  assert.deepEqual(keys, ['funz:', 'tempo', 'reset', 'guasto:Fungo', 'corto:Fungo', 'param:F-CPU']);
  assert.match(V.proveAuto(f)[0].testo, /\(Fungo\)/);
});

test('una prova funzionale per percorso con i suoi iniziatori; cat. 2 = test periodico', () => {
  const f = { sottosistemi: [ss('Fungo', 'rilevamento', { percorso: 'Quadro' }), ss('Barriera', 'rilevamento', { percorso: 'Zona' }),
    ss('Relè', 'logica', { metodo: 'arch', categoria: '2' })] };
  const p = V.proveAuto(f);
  assert.equal(p[0].key, 'funz:Quadro'); assert.match(p[0].testo, /^Quadro: .*\(Fungo\)/);
  assert.equal(p[1].key, 'funz:Zona'); assert.match(p[1].testo, /\(Barriera\)/);
  assert.match(p.find(x => x.key === 'guasto:Relè').testo, /test periodico/);
});

test('esiti per chiave, prove aggiunte e riepilogo', () => {
  const f = { sottosistemi: [ss('KTP', 'rilevamento')],
    validazione: { esiti: { 'funz:': { esito: 'ok' }, tempo: { esito: 'ok' }, reset: { esito: 'na' }, 'param:KTP': { esito: 'ok' }, 'extra:a': { esito: '' } },
      extra: [{ id: 'a', testo: 'Prova aggiunta', atteso: 'x' }] } };
  const lista = V.prove(f);
  assert.equal(lista.length, 5);
  assert.equal(lista[4].testo, 'Prova aggiunta');
  assert.deepEqual(V.riepilogo(lista), { totali: 5, ok: 3, ko: 0, na: 1, aperte: 1, completa: false });
  f.validazione.esiti['extra:a'].esito = 'ok';
  assert.equal(V.riepilogo(V.prove(f)).completa, true);
  f.validazione.esiti.tempo.esito = 'ko';
  assert.equal(V.riepilogo(V.prove(f)).completa, false);
});

test('nessuna prova senza funzione = non validata', () => {
  assert.equal(V.riepilogo([]).completa, false);
});
