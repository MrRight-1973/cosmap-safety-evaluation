// Gestione dell'archivio articoli: unione degli import, riepilogo per costruttore, filtri.
// Funzioni pure, senza interfaccia. Nel browser espone window.Archivio, in Node module.exports.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Archivio = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VALORI = ['pfh', 'b10d', 'mttfd'];
  const stessiValori = (a, b) => VALORI.every(k => (a[k] ?? null) === (b[k] ?? null));

  // Aggiunge o aggiorna gli articoli importati (stesso id = stesso articolo).
  // Se un valore numerico cambia, l'articolo torna "non verificato"; le note dell'utente restano.
  function unisci(archivio, importati) {
    const out = archivio.slice();
    const pos = new Map(out.map((a, i) => [a.id, i]));
    const esito = { nuovi: 0, aggiornati: 0, invariati: 0 };
    for (const n of importati) {
      const i = pos.get(n.id);
      if (i == null) { pos.set(n.id, out.length); out.push({ ...n }); esito.nuovi++; continue; }
      const v = out[i];
      if (stessiValori(v, n) && v.fonte === n.fonte) {
        if (n.immagine && n.immagine !== v.immagine) out[i] = { ...v, immagine: n.immagine }; // stesso articolo, ora con immagine
        esito.invariati++;
        continue;
      }
      out[i] = { ...v, ...n, verificato: stessiValori(v, n) ? v.verificato : false, note: v.note || n.note };
      esito.aggiornati++;
    }
    return { articoli: out, ...esito };
  }

  // Aggiunge gli articoli di partenza che mancano, senza toccare quelli già presenti
  function conDefault(archivio, predefiniti) {
    const ids = new Set(archivio.map(a => a.id));
    return archivio.concat(predefiniti.filter(a => !ids.has(a.id)).map(a => ({ ...a })));
  }

  function perProduttore(archivio) {
    const m = new Map();
    for (const a of archivio) {
      const k = a.produttore || '(senza produttore)';
      if (!m.has(k)) m.set(k, { produttore: k, articoli: 0, daVerificare: 0, senzaFonte: 0, librerie: new Set(), tipi: {} });
      const r = m.get(k);
      r.articoli++;
      if (!a.verificato) r.daVerificare++;
      if (!a.fonte) r.senzaFonte++;
      if (a.libreria) r.librerie.add(a.libreria);
      r.tipi[a.tipo || '—'] = (r.tipi[a.tipo || '—'] || 0) + 1;
    }
    return [...m.values()].map(r => ({ ...r, librerie: [...r.librerie] })).sort((a, b) => a.produttore.localeCompare(b.produttore));
  }

  function filtra(archivio, f = {}) {
    const q = (f.testo || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    return archivio.filter(a =>
      (!f.produttore || (a.produttore || '(senza produttore)') === f.produttore) &&
      (!f.tipo || a.tipo === f.tipo) &&
      (!f.daVerificare || !a.verificato) &&
      q.every(t => `${a.codice} ${a.descrizione} ${a.gruppo || ''} ${a.produttore}`.toLowerCase().includes(t)));
  }

  return { unisci, conDefault, perProduttore, filtra };
});
