# cosmap-safety-evaluation

> **Dismessa.** Le funzioni di sicurezza (calcolo del PL, validazione, verifiche elettriche) sono un modulo dell'app
> Analisi dei rischi, repository `cosmap-analisi-rischi`, con revisioni, firme e documenti archiviati. Questa app
> resta solo per portare là i dati già fatti:
>
> - **Valutazioni**: Report → "Esporta valutazione" (file .json); nell'analisi, riquadro Funzioni di sicurezza,
>   "Importa dalla safety evaluation". Entrano articoli usati, funzioni con il calcolo, prove di validazione,
>   misure contro i guasti sistematici e verifiche elettriche.
> - **Archivio articoli** (`data/archivio-articoli.json`): in Libreria e utenti → Articoli di sicurezza →
>   "Importa libreria del costruttore", oppure `python manage.py importa_articoli percorso\archivio-articoli.json`.
>   Lì si importano anche le librerie SISTEMA e VDMA dei costruttori.
>
> Il motore (`engine.js`, `schema.js`, `validazione.js`, `sistema.js`, `vdma.js`, `zip.js`) e i suoi test sono stati
> copiati nell'analisi dei rischi (commit c080e8a): le correzioni si fanno solo là.

Strumenti per la safety evaluation delle funzioni di sicurezza secondo ISO 13849-1 (PL) e IEC 62061 (SIL). Nessuna dipendenza: HTML e JavaScript che girano nel browser, anche offline.

- `safety-eval/`: web app che guida passo passo la valutazione partendo da un archivio articoli; l'architettura di ogni funzione si costruisce come schema a blocchi, con i percorsi alternativi (per esempio funghi su F-DI oppure fungo sul pannello PROFIsafe) su righe diverse. Si apre `safety-eval/index.html`, oppure `npm run build` crea `safety-eval/safety-eval.html` a file unico. Dettagli in `safety-eval/CLAUDE.md`.
- `calcolo-pl/`: primo calcolatore del PFH per la funzione di emergenza con SINAMICS S120 in PROFIsafe. Dettagli in `calcolo-pl/CLAUDE.md`.

## Avvio in localhost

Serve Node.js 18 o successivo. Dalla cartella del repository:

```
npm start
```

poi apri http://localhost:8080 nel browser. Per usare un'altra porta: `PORT=3000 npm start` (su Windows PowerShell: `$env:PORT=3000; npm start`).

L'archivio articoli viene salvato in `data/archivio-articoli.json` (con una copia della versione precedente in `archivio-articoli.bak.json`); per un'altra cartella: `DATA_DIR=...`. La cartella `data/` resta fuori dal repository. La valutazione in corso resta salvata nel browser: usa "Esporta valutazione" per tenerne una copia. Se apri la pagina senza `npm start`, anche l'archivio resta solo nel browser.

## Importare le librerie dei costruttori

Nell'app: Archivio articoli → "Importa libreria costruttore (SISTEMA .slb, VDMA .xml o .zip)" e scegli il file. Il file viene letto direttamente nel browser, senza programmi da installare, e non viene modificato. Formati:
- **SISTEMA** `.slb` (database Firebird), letto da `safety-eval/sistema.js`.
- **VDMA 66413** `.xml` (per esempio il `vdma.xml` di Siemens), letto da `safety-eval/vdma.js`. Ogni "use case" di un dispositivo diventa un articolo, con le condizioni d'uso (PROFIsafe, funzioni Basic/Extended, ecc.) nella descrizione. Quando il database dà B10 o MTTF con la quota di guasti pericolosi RDF, B10d e MTTFd vengono ricavati come B10 / RDF e MTTF / RDF e il calcolo è scritto nella fonte.
- **Pacchetto .zip** del costruttore con il database VDMA e le immagini: l'app trova il `.xml`, lo importa e collega a ogni articolo la sua immagine (`IconFileName`). Con `npm start` le immagini vengono salvate in `data/immagini/`; senza server restano nel browser finché c'è spazio. Prima di aggiungere gli articoli l'app mostra quanti sono nuovi, aggiornati o già presenti e quali voci ha scartato.

Ogni articolo entra come "da verificare", con la libreria (nome, versione e data) come fonte. I sottosistemi portano il PFH, gli elementi il B10d o l'MTTFd. Gli elementi il cui MTTFd SISTEMA lo ricava da altri dati (λ, MTTF, sotto-elementi) vengono scartati. Reimportando una versione nuova della stessa libreria, gli articoli con valori cambiati tornano "da verificare" e le note restano.

L'archivio si gestisce per costruttore (riepilogo con articoli, tipologie, da verificare, librerie importate; clic per filtrare, eliminazione di un costruttore intero) e si filtra per testo, tipologia e "solo da verificare". Nel passo 3 ogni sottosistema propone solo gli articoli della tipologia adatta al suo ruolo (rilevamento → sensore, logica → logica, attuazione → attuatore), raggruppati per costruttore, con una ricerca e la spunta "tutte le tipologie" per vedere il resto.

In alternativa resta lo script `tools/slb2json.py`, che usa Firebird 5 e `pip install firebird-driver` e produce un JSON da caricare con "Importa JSON".

Le librerie e i JSON ricavati restano fuori dal repository (`*.slb`, `vdma*.xml`, `*.zip`, `librerie/` e `data/` sono in `.gitignore`), perché i dati appartengono ai costruttori.

## Test

```
npm test
```

Girano anche a ogni push e PR (GitHub Actions), insieme ai test del convertitore SISTEMA (`python3 -m unittest discover -s tools/test`). Includono i casi di riferimento S120 (552, 840, 46, 92 ·10⁻⁹/h).

## Regola sui dati

Ogni valore di catalogo (PFH, B10d, MTTFd) deve avere una fonte: documento, versione e data. I risultati vanno confrontati con SISTEMA o con il Safety Evaluation Tool prima di usarli in documenti di conformità.
