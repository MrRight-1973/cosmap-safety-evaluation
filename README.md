# cosmap-safety-evaluation

Strumenti per la safety evaluation delle funzioni di sicurezza secondo ISO 13849-1 (PL) e IEC 62061 (SIL). Nessuna dipendenza: HTML e JavaScript che girano nel browser, anche offline.

- `safety-eval/`: web app che guida passo passo la valutazione partendo da un archivio articoli. Si apre `safety-eval/index.html`, oppure `npm run build` crea `safety-eval/safety-eval.html` a file unico. Dettagli in `safety-eval/CLAUDE.md`.
- `calcolo-pl/`: primo calcolatore del PFH per la funzione di emergenza con SINAMICS S120 in PROFIsafe. Dettagli in `calcolo-pl/CLAUDE.md`.

## Avvio in localhost

Serve Node.js 18 o successivo. Dalla cartella del repository:

```
npm start
```

poi apri http://localhost:8080 nel browser. Per usare un'altra porta: `PORT=3000 npm start` (su Windows PowerShell: `$env:PORT=3000; npm start`). I dati della valutazione restano salvati nel browser: usa "Esporta valutazione" per tenerne una copia.

## Importare una libreria SISTEMA

Le librerie SISTEMA dei costruttori (file `.slb`) si convertono nel formato dell'archivio con `tools/slb2json.py`. Il file `.slb` è un database Firebird: lo script ne legge una copia e non modifica l'originale.

Preparazione, una volta sola:
1. Scarica Firebird 5 da https://github.com/FirebirdSQL/firebird/releases: su Windows il file `Firebird-5.x-windows-x64.zip`, su Linux il `.tar.gz`. Scompattalo in una cartella, per esempio `C:\Tools\firebird`, senza installarlo.
2. Installa il driver Python: `pip install firebird-driver`.

Conversione:

```
python tools/slb2json.py "Pizzato_Elettrica_Sistema_en_A26 locked.slb" librerie/pizzato-A26.json --firebird C:\Tools\firebird
```

Poi nell'app apri Archivio articoli → Importa archivio e scegli il JSON. Ogni articolo entra come "non verificato", con la libreria (nome, versione e data) come fonte. I sottosistemi portano il PFH, gli elementi il B10d o l'MTTFd. Gli elementi il cui MTTFd SISTEMA lo ricava da altri dati (λ, MTTF, sotto-elementi) vengono scartati e l'elenco li segnala.

Le librerie e i JSON ricavati restano fuori dal repository (`*.slb` e `librerie/` sono in `.gitignore`), perché i dati appartengono ai costruttori.

## Test

```
npm test
```

Girano anche a ogni push e PR (GitHub Actions), insieme ai test del convertitore SISTEMA (`python3 -m unittest discover -s tools/test`). Includono i casi di riferimento S120 (552, 840, 46, 92 ·10⁻⁹/h).

## Regola sui dati

Ogni valore di catalogo (PFH, B10d, MTTFd) deve avere una fonte: documento, versione e data. I risultati vanno confrontati con SISTEMA o con il Safety Evaluation Tool prima di usarli in documenti di conformità.
