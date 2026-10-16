// Motore di calcolo della safety evaluation (ISO 13849-1). Nessuna dipendenza:
// nel browser espone window.SafetyEngine, in Node module.exports.
// Unità: PFH in 10⁻⁹/h nei dati, conversione a 1/h solo per le soglie. MTTFd e T10d in anni.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SafetyEngine = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ISO 13849-1, tab. 2: PFH [1/h] per PL, limite superiore escluso. SIL secondo IEC 62061.
  const PL_LIMITS = [
    { pl: 'e', max: 1e-7, sil: 3 },
    { pl: 'd', max: 1e-6, sil: 2 },
    { pl: 'c', max: 3e-6, sil: 1 },
    { pl: 'b', max: 1e-5, sil: 1 },
    { pl: 'a', max: 1e-4, sil: 0 },
  ];
  const NONE = { pl: 'nessuno', max: Infinity, sil: 0 };
  const PL_RANK = { nessuno: 0, a: 1, b: 2, c: 3, d: 4, e: 5 };

  function toPL(pfh) {
    for (const l of PL_LIMITS) if (pfh < l.max) return l;
    return NONE;
  }
  function plMin(a, b) {
    if (a == null) return b;
    if (b == null) return a;
    return PL_RANK[a] <= PL_RANK[b] ? a : b;
  }
  function plAtLeast(pl, req) { return PL_RANK[pl] >= PL_RANK[req]; }

  // ISO 13849-1, allegato A, fig. A.1: grafo del rischio.
  function plr(S, F, P) {
    if (!S || !F || !P) return null;
    const i = (S === 'S2' ? 4 : 0) + (F === 'F2' ? 2 : 0) + (P === 'P2' ? 1 : 0);
    return ['a', 'b', 'b', 'c', 'c', 'd', 'd', 'e'][i];
  }

  // ISO 13849-1, allegato C (C.4): componenti con usura.
  function nop(dop, hop, tcycleS) { return (dop * hop * 3600) / tcycleS; }
  function b10dToMttfd(b10d, nopYear) { return b10d / (0.1 * nopYear); }
  function t10d(b10d, nopYear) { return b10d / nopYear; }

  // ISO 13849-1, tab. 5 (MTTFd per canale) e tab. 6 (DC).
  function mttfdLevel(y) {
    if (!(y >= 3)) return 'insufficiente';
    if (y < 10) return 'basso';
    if (y < 30) return 'medio';
    return 'alto';
  }
  function dcLevel(dc) {
    if (!(dc >= 60)) return 'nessuno';
    if (dc < 90) return 'basso';
    if (dc < 99) return 'medio';
    return 'alto';
  }
  const LEVEL_RANK = { insufficiente: -1, nessuno: 0, basso: 1, medio: 2, alto: 3 };

  // ISO 13849-1, allegato F, tab. F.1: misure contro i guasti di causa comune (soglia 65 punti).
  const CCF_MEASURES = [
    { id: 'separazione', punti: 15, testo: 'Separazione fisica tra i percorsi dei segnali' },
    { id: 'diversita', punti: 20, testo: 'Diversità (tecnologie, componenti o principi diversi)' },
    { id: 'sovratensioni', punti: 15, testo: 'Protezione da sovratensioni, sovrapressioni, ecc.' },
    { id: 'collaudati', punti: 5, testo: 'Componenti ben collaudati' },
    { id: 'fmea', punti: 5, testo: 'FMEA per individuare i guasti di causa comune' },
    { id: 'competenza', punti: 5, testo: 'Formazione dei progettisti su CCF' },
    { id: 'emc', punti: 25, testo: 'Compatibilità elettromagnetica verificata' },
    { id: 'ambiente', punti: 10, testo: 'Resistenza a temperatura, urti, vibrazioni, umidità' },
  ];
  const CCF_MIN = 65;
  function ccfScore(sel) {
    return CCF_MEASURES.reduce((s, m) => s + (sel && sel[m.id] ? m.punti : 0), 0);
  }

  // ISO 13849-1, cap. 6.2 e fig. 5: requisiti delle categorie.
  const CATEGORIE = {
    B: { maxPL: 'b', canali: 1, dcMin: null, mttfdMin: 'basso', ccf: false, collaudati: false },
    1: { maxPL: 'c', canali: 1, dcMin: null, mttfdMin: 'alto', ccf: false, collaudati: true },
    2: { maxPL: 'd', canali: 1, dcMin: 'basso', mttfdMin: 'basso', ccf: true, collaudati: false },
    3: { maxPL: 'e', canali: 2, dcMin: 'basso', mttfdMin: 'basso', ccf: true, collaudati: false },
    4: { maxPL: 'e', canali: 2, dcMin: 'alto', mttfdMin: 'alto', ccf: true, collaudati: false },
  };

  function seriesMttfd(items) {
    const inv = items.reduce((s, c) => s + c.qty / c.mttfd, 0);
    return inv > 0 ? 1 / inv : null;
  }
  // ISO 13849-1, allegato D, eq. D.2: simmetrizzazione di due canali diversi.
  function symmetrize(a, b) {
    if (a == null || b == null) return a ?? b;
    return (2 / 3) * (a + b - 1 / (1 / a + 1 / b));
  }

  function evalSubsystem(ss, articoli, missionTime) {
    const mt = missionTime || 20;
    const errors = [], warns = [];
    const find = id => articoli.find(a => a.id === id);
    const comps = (ss.componenti || []).map(c => ({ c, a: find(c.articoloId), qty: c.qty ?? 1 }));
    if (!comps.length) warns.push('Nessun componente scelto.');
    for (const { c, a } of comps) {
      if (!a) errors.push(`Articolo "${c.articoloId}" non trovato nell'archivio.`);
      else if (!a.fonte) warns.push(`${a.codice}: manca la fonte del dato.`);
    }

    if (ss.metodo !== 'arch') {
      let nano = 0, cap = null;
      for (const { a, qty } of comps) {
        if (!a) continue;
        if (a.pfh == null) warns.push(`${a.codice}: PFH non inserito, considerato 0.`);
        else nano += qty * a.pfh;
        if (a.plMax) cap = plMin(cap, a.plMax);
      }
      const pl = plMin(toPL(nano * 1e-9).pl, cap);
      return { metodo: 'pfh', nano, pl, errors, warns };
    }

    // Architettura designata: MTTFd per canale, DCavg, categoria, CCF, PFH da tab. K.1.
    const cat = CATEGORIE[ss.categoria];
    if (!cat) errors.push('Categoria non scelta.');
    const items = [];
    for (const { c, a, qty } of comps) {
      if (!a) continue;
      let mttfd = a.mttfd ?? null, t10 = null;
      if (mttfd == null && a.b10d != null) {
        if (c.dop > 0 && c.hop > 0 && c.tcycle > 0) {
          const n = nop(c.dop, c.hop, c.tcycle);
          mttfd = b10dToMttfd(a.b10d, n);
          t10 = t10d(a.b10d, n);
          if (t10 < mt) warns.push(`${a.codice}: T10d = ${t10.toFixed(1)} anni, inferiore alla mission time: va sostituito prima.`);
        } else warns.push(`${a.codice}: inserisci giorni/anno, ore/giorno e tempo ciclo per calcolare MTTFd da B10d.`);
      }
      if (mttfd == null) { warns.push(`${a.codice}: né MTTFd né B10d disponibili, componente escluso dal calcolo.`); continue; }
      if (c.dc == null) warns.push(`${a.codice}: DC non inserita, considerata 0 %.`);
      items.push({ codice: a.codice, canale: c.canale === 2 ? 2 : 1, qty, mttfd, dc: c.dc ?? 0, t10 });
    }
    const ch1 = seriesMttfd(items.filter(i => i.canale === 1));
    let ch2 = seriesMttfd(items.filter(i => i.canale === 2));
    if (cat && cat.canali === 2 && ch2 == null && ch1 != null) {
      warns.push('Categoria a due canali ma nessun componente sul canale 2: considerato uguale al canale 1.');
      ch2 = ch1;
    }
    const cap = ss.categoria === '4' ? 2500 : 100; // tab. 5, nota per la categoria 4
    let mttfd = cat && cat.canali === 2 ? symmetrize(ch1, ch2) : ch1;
    if (mttfd != null && mttfd > cap) mttfd = cap;
    const den = items.reduce((s, i) => s + i.qty / i.mttfd, 0);
    const dcavg = den > 0 ? items.reduce((s, i) => s + (i.qty * i.dc) / i.mttfd, 0) / den : null;
    const mLev = mttfd == null ? null : mttfdLevel(mttfd);
    const dLev = dcavg == null ? null : dcLevel(dcavg);
    const ccf = ccfScore(ss.ccf);

    if (cat) {
      if (mLev === 'insufficiente') errors.push(`MTTFd ${mttfd.toFixed(1)} anni: sotto 3 anni non è ammesso.`);
      else if (mLev && LEVEL_RANK[mLev] < LEVEL_RANK[cat.mttfdMin]) errors.push(`Categoria ${ss.categoria}: MTTFd almeno "${cat.mttfdMin}", ottenuto "${mLev}".`);
      if (cat.dcMin && dLev && LEVEL_RANK[dLev] < LEVEL_RANK[cat.dcMin]) errors.push(`Categoria ${ss.categoria}: DCavg almeno "${cat.dcMin}", ottenuta "${dLev}" (${dcavg.toFixed(1)} %).`);
      if (cat.ccf && ccf < CCF_MIN) errors.push(`Categoria ${ss.categoria}: CCF ${ccf} punti, ne servono almeno ${CCF_MIN}.`);
      if (cat.collaudati && !ss.collaudati) errors.push('Categoria 1: i componenti devono essere ben collaudati.');
    }
    const nano = ss.pfhK1 ?? null;
    if (nano == null) warns.push('Inserisci il PFH letto in ISO 13849-1, tab. K.1, per categoria, DCavg e MTTFd del sottosistema.');
    const pl = nano == null ? null : plMin(toPL(nano * 1e-9).pl, cat ? cat.maxPL : null);
    return { metodo: 'arch', nano, pl, ch1, ch2, mttfd, mttfdLevel: mLev, dcavg, dcLevel: dLev, ccf, items, errors, warns };
  }

  // Sottosistemi senza percorso sono comuni; quelli con un percorso sono iniziatori alternativi (OR):
  // ogni percorso = comuni + i suoi, in serie. La funzione ha il PL del percorso peggiore.
  function evalFunction(fn, articoli, missionTime) {
    const req = plr(fn.S, fn.F, fn.P);
    const subs = (fn.sottosistemi || []).map(ss => ({ ss, r: evalSubsystem(ss, articoli, missionTime) }));
    const names = [...new Set(subs.map(x => (x.ss.percorso || '').trim()).filter(Boolean))];
    const groups = names.length ? names : [''];
    const paths = groups.map(nome => {
      const chain = subs.filter(x => !(x.ss.percorso || '').trim() || x.ss.percorso.trim() === nome);
      const nano = chain.reduce((s, x) => s + (x.r.nano || 0), 0);
      const complete = chain.length > 0 && chain.every(x => x.r.pl != null);
      let pl = complete ? toPL(nano * 1e-9).pl : null;
      if (complete) for (const x of chain) pl = plMin(pl, x.r.pl); // ISO 13849-1, 6.3
      return { nome: nome || 'unico', nano, pl, complete, sottosistemi: chain.map(x => x.ss.nome) };
    });
    const worst = paths.reduce((w, p) => {
      if (!w) return p;
      if (p.pl == null || w.pl == null) return p.pl == null ? p : w;
      return PL_RANK[p.pl] < PL_RANK[w.pl] || (p.pl === w.pl && p.nano > w.nano) ? p : w;
    }, null);
    const errors = subs.flatMap(x => x.r.errors.map(e => `${x.ss.nome}: ${e}`));
    const warns = subs.flatMap(x => x.r.warns.map(e => `${x.ss.nome}: ${e}`));
    if (!req) warns.push('PLr non definito: completa S, F e P.');
    const missing = ['rilevamento', 'logica', 'attuazione'].filter(ruolo => !subs.some(x => x.ss.ruolo === ruolo));
    if (missing.length) warns.push(`Funzione incompleta: manca un sottosistema di ${missing.join(', ')}.`);
    const pl = worst ? worst.pl : null;
    const ok = !!(req && pl && worst.complete && !missing.length && !errors.length && plAtLeast(pl, req));
    return { plr: req, subs, paths, worst, pl, ok, errors, warns };
  }

  return {
    PL_LIMITS, toPL, plMin, plAtLeast, plr, nop, b10dToMttfd, t10d, mttfdLevel, dcLevel,
    CCF_MEASURES, CCF_MIN, ccfScore, CATEGORIE, symmetrize, evalSubsystem, evalFunction,
  };
});
