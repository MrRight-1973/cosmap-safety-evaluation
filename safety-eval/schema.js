// Schema a blocchi di una funzione di sicurezza: percorsi alternativi (righe) e sottosistemi in serie.
// Un sottosistema con percorso vuoto è comune a tutti i percorsi. Funzioni pure sul modello della
// funzione ({ sottosistemi, percorsi }); nel browser window.Schema, in Node module.exports.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Schema = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ORDINE = ['rilevamento', 'comunicazione', 'logica', 'attuazione'];
  const nomeDi = ss => (ss.percorso || '').trim();

  // Nomi dei percorsi, nell'ordine in cui sono stati creati; [''] = percorso unico
  function percorsi(f) {
    const nomi = [...new Set([...(f.percorsi || []), ...f.sottosistemi.map(nomeDi)].filter(Boolean))];
    return nomi.length ? nomi : [''];
  }

  // Sottosistemi in serie lungo un percorso: i suoi più quelli comuni, in ordine di ruolo
  function catena(f, nome) {
    const rank = ss => { const i = ORDINE.indexOf(ss.ruolo); return i < 0 ? ORDINE.length : i; };
    return f.sottosistemi
      .map((ss, i) => ({ ss, i }))
      .filter(({ ss }) => !nomeDi(ss) || nomeDi(ss) === nome)
      // stesso ruolo: prima i blocchi del percorso (es. scheda F-DI), poi quelli comuni (es. F-CPU)
      .sort((a, b) => rank(a.ss) - rank(b.ss) || !nomeDi(a.ss) - !nomeDi(b.ss) || a.i - b.i)
      .map(x => x.ss);
  }

  // Aggiunge un percorso alternativo e ne restituisce il nome. Passando da uno a due percorsi,
  // gli iniziatori già presenti (rilevamento comune) vanno nel primo: il resto resta comune.
  function aggiungiPercorso(f) {
    const nomi = percorsi(f).filter(Boolean);
    const libero = () => { let n = 1; while (nomi.includes(`Percorso ${n}`)) n++; return `Percorso ${n}`; };
    if (!nomi.length) {
      const primo = libero();
      nomi.push(primo);
      for (const ss of f.sottosistemi) if (ss.ruolo === 'rilevamento' && !nomeDi(ss)) ss.percorso = primo;
    }
    const nuovo = libero();
    nomi.push(nuovo);
    f.percorsi = nomi;
    return nuovo;
  }

  function rinominaPercorso(f, vecchio, nuovo) {
    nuovo = (nuovo || '').trim();
    const elenco = percorsi(f).filter(Boolean);
    if (!nuovo || !elenco.includes(vecchio) || elenco.includes(nuovo)) return false;
    for (const ss of f.sottosistemi) if (nomeDi(ss) === vecchio) ss.percorso = nuovo;
    f.percorsi = elenco.map(n => (n === vecchio ? nuovo : n));
    return true;
  }

  // Elimina il percorso e i sottosistemi solo suoi; quelli comuni restano
  function eliminaPercorso(f, nome) {
    f.sottosistemi = f.sottosistemi.filter(ss => nomeDi(ss) !== nome);
    f.percorsi = percorsi(f).filter(n => n && n !== nome);
  }

  return { ORDINE, percorsi, catena, aggiungiPercorso, rinominaPercorso, eliminaPercorso };
});
