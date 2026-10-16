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

## Test

```
npm test
```

Girano anche a ogni push e PR (GitHub Actions). Includono i casi di riferimento S120 (552, 840, 46, 92 ·10⁻⁹/h).

## Regola sui dati

Ogni valore di catalogo (PFH, B10d, MTTFd) deve avere una fonte: documento, versione e data. I risultati vanno confrontati con SISTEMA o con il Safety Evaluation Tool prima di usarli in documenti di conformità.
