// Misure contro i guasti sistematici (ISO 13849-1, all. G e requisiti del software di sicurezza) e prove
// di validazione delle funzioni (ISO 13849-2). Sono liste di controllo: nessun valore numerico.
// Le prove di ogni funzione si ricavano dallo schema a blocchi; gli esiti stanno in f.validazione.esiti
// per chiave, così una prova resta compilata finché il blocco che l'ha generata esiste.
// Nel browser window.Validazione, in Node module.exports (richiede schema.js).
(function (root, factory) {
  const api = factory(typeof module !== 'undefined' && module.exports ? require('./schema.js') : root.Schema);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Validazione = api;
})(typeof self !== 'undefined' ? self : this, function (Schema) {
  'use strict';

  const MISURE_SISTEMATICHE = [
    { gruppo: 'Controllo dei guasti sistematici (ISO 13849-1, all. G)', misure: [
      ['deenergia', 'Stato sicuro ottenuto per de-energizzazione'],
      ['alimentazione', 'Effetti di interruzione, sovratensione e sottotensione dell\'alimentazione controllati'],
      ['ambiente', 'Condizioni ambientali (temperatura, umidità, vibrazioni, polvere) ed EMC compatibili con i dati dei componenti'],
      ['trasmissione', 'Errori della trasmissione dati controllati (es. PROFIsafe)'],
      ['contatti', 'Contatti a guida forzata o ad apertura diretta dove richiesto'],
    ] },
    { gruppo: 'Prevenzione dei guasti sistematici (ISO 13849-1, all. G)', misure: [
      ['componenti', 'Componenti scelti, dimensionati e installati secondo le istruzioni del costruttore'],
      ['cablaggio', 'Cablaggio protetto da errori e cortocircuiti (canali separati, rilevamento dei cortocircuiti tra canali)'],
      ['revisione', 'Progetto (schemi elettrici, parametri) rivisto da una persona diversa dal progettista'],
      ['documentazione', 'Schemi e documentazione aggiornati alla revisione di questo documento'],
    ] },
    { gruppo: 'Software di sicurezza (ISO 13849-1, SRASW)', misure: [
      ['sw-specifica', 'Specifica dei requisiti del software di sicurezza documentata'],
      ['sw-librerie', 'Blocchi funzionali di sicurezza certificati del costruttore'],
      ['sw-struttura', 'Programma modulare e strutturato, linguaggio a variabilità limitata (FBD/LAD)'],
      ['sw-review', 'Revisione del codice'],
      ['sw-test', 'Test funzionali del programma documentati'],
      ['sw-versioni', 'Gestione delle versioni e analisi d\'impatto delle modifiche'],
      ['sw-firma', 'Firma del programma F e stampa di accettazione archiviate'],
    ] },
  ];

  const ESITI = [['', '—'], ['ok', 'OK'], ['ko', 'Non OK'], ['na', 'Non applicabile']];

  const elenco = nomi => nomi.filter(Boolean).join(', ') || '—';

  // Prove standard di una funzione, nell'ordine dello schema: una prova funzionale per percorso,
  // tempo di risposta e reset, poi per ogni blocco l'iniezione dei guasti (architettura designata,
  // cat. 2, 3, 4) o il controllo della parametrizzazione (PFH da certificato).
  function proveAuto(f) {
    const nomi = Schema.percorsi(f);
    const prove = nomi.map(nome => {
      const iniziatori = Schema.catena(f, nome).filter(ss => ss.ruolo === 'rilevamento').map(ss => ss.nome);
      return { key: 'funz:' + nome, testo: (nome ? `${nome}: attivare ` : 'Attivare ') + `ogni dispositivo di comando o rilevamento (${elenco(iniziatori)})`,
        atteso: 'Raggiunto lo stato sicuro previsto dalla funzione' };
    });
    prove.push(
      { key: 'tempo', testo: 'Misurare il tempo di risposta fino allo stato sicuro', atteso: 'Entro il tempo richiesto dalla valutazione dei rischi' },
      { key: 'reset', testo: 'Ripristinare il comando dopo l\'intervento', atteso: 'Nessun riavvio automatico: serve un reset manuale' });
    for (const g of Schema.gruppi(f)) for (const ss of g.blocchi) {
      if (ss.metodo === 'arch' && ['3', '4'].includes(ss.categoria)) {
        prove.push(
          { key: `guasto:${ss.id}`, testo: `${ss.nome}: simulare un guasto su un canale (contatto incollato o filo interrotto)`,
            atteso: 'Guasto rilevato, funzione mantenuta, riavvio impedito fino alla riparazione' },
          { key: `corto:${ss.id}`, testo: `${ss.nome}: simulare un cortocircuito tra i due canali`, atteso: 'Cortocircuito rilevato, stato sicuro' });
      } else if (ss.metodo === 'arch' && ss.categoria === '2') {
        prove.push({ key: `guasto:${ss.id}`, testo: `${ss.nome}: simulare un guasto e attendere il test periodico`,
          atteso: 'Guasto rilevato dal test, stato sicuro o segnalazione' });
      } else if (ss.metodo === 'pfh') {
        prove.push({ key: `param:${ss.id}`, testo: `${ss.nome}: confrontare parametri e cablaggio con il manuale e il certificato del costruttore`,
          atteso: 'Parametri conformi (es. tempo di discrepanza, parametri F)' });
      }
    }
    return prove;
  }

  // Prove standard + prove aggiunte a mano, ognuna con il suo esito
  function prove(f) {
    const v = f.validazione || {};
    const esiti = v.esiti || {};
    return [...proveAuto(f), ...(v.extra || []).map(p => ({ key: 'extra:' + p.id, testo: p.testo, atteso: p.atteso, extra: p }))]
      .map(p => ({ ...p, ...(esiti[p.key] || {}) }));
  }

  // Validazione completa quando ogni prova applicabile è OK
  function riepilogo(lista) {
    const conta = e => lista.filter(p => (p.esito || '') === e).length;
    const r = { totali: lista.length, ok: conta('ok'), ko: conta('ko'), na: conta('na'), aperte: conta('') };
    r.completa = r.totali > 0 && r.ko === 0 && r.aperte === 0;
    return r;
  }

  return { MISURE_SISTEMATICHE, ESITI, proveAuto, prove, riepilogo };
});
