# cosmap-safety-evaluation

Strumenti per la safety evaluation delle funzioni di sicurezza secondo ISO 13849-1 (PL) e IEC 62061 (SIL). Nessuna dipendenza: HTML e JavaScript che girano nel browser, anche offline.

- `safety-eval/`: web app che guida passo passo la valutazione partendo da un archivio articoli. Si apre `safety-eval/index.html`, oppure `npm run build` crea `safety-eval/safety-eval.html` a file unico. Dettagli in `safety-eval/CLAUDE.md`.
- `calcolo-pl/`: primo calcolatore del PFH per la funzione di emergenza con SINAMICS S120 in PROFIsafe. Dettagli in `calcolo-pl/CLAUDE.md`.

## Avvio in localhost

Serve Node.js 18 o successivo. Dalla cartella del repository:

```
npm start
```

poi apri http://localhost:8080 nel browser. Per usare un'altra porta: `PORT=3000 npm start` (su Windows PowerShell: `$env:PORT=3000; npm start`).

L'archivio articoli viene salvato in `data/archivio-articoli.json` (con una copia della versione precedente in `archivio-articoli.bak.json`); per un'altra cartella: `DATA_DIR=...`. La cartella `data/` resta fuori dal repository. La valutazione in corso resta salvata nel browser: usa "Esporta valutazione" per tenerne una copia. Se apri la pagina senza `npm start`, anche l'archivio resta solo nel browser.

## Importare una libreria SISTEMA

Nell'app: Archivio articoli → "Importa libreria SISTEMA (.slb)" e scegli il file del costruttore. Il file viene letto direttamente nel browser (`safety-eval/sistema.js`, nessun programma da installare) e non viene modificato. Prima di aggiungere gli articoli l'app mostra quanti sono nuovi, aggiornati o già presenti e quali voci ha scartato.

Ogni articolo entra come "da verificare", con la libreria (nome, versione e data) come fonte. I sottosistemi portano il PFH, gli elementi il B10d o l'MTTFd. Gli elementi il cui MTTFd SISTEMA lo ricava da altri dati (λ, MTTF, sotto-elementi) vengono scartati. Reimportando una versione nuova della stessa libreria, gli articoli con valori cambiati tornano "da verificare" e le note restano.

L'archivio si gestisce per costruttore (riepilogo con articoli, tipologie, da verificare, librerie importate; clic per filtrare, eliminazione di un costruttore intero) e si filtra per testo, tipologia e "solo da verificare". Nel passo 3 gli articoli sono raggruppati per costruttore.

In alternativa resta lo script `tools/slb2json.py`, che usa Firebird 5 e `pip install firebird-driver` e produce un JSON da caricare con "Importa JSON".

Le librerie e i JSON ricavati restano fuori dal repository (`*.slb`, `librerie/` e `data/` sono in `.gitignore`), perché i dati appartengono ai costruttori.

## Test

```
npm test
```

Girano anche a ogni push e PR (GitHub Actions), insieme ai test del convertitore SISTEMA (`python3 -m unittest discover -s tools/test`). Includono i casi di riferimento S120 (552, 840, 46, 92 ·10⁻⁹/h).

## Regola sui dati

Ogni valore di catalogo (PFH, B10d, MTTFd) deve avere una fonte: documento, versione e data. I risultati vanno confrontati con SISTEMA o con il Safety Evaluation Tool prima di usarli in documenti di conformità.
