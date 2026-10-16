# safety-eval

Web app statica (HTML + JS, nessuna dipendenza; con `npm start` il server locale salva l'archivio su file) che guida passo passo una safety evaluation secondo ISO 13849-1 partendo da un archivio articoli. Lingua: italiano. Deriva dal calcolatore in `../calcolo-pl/`. Test di tutto il repository: `npm test` dalla radice.

## File
- `index.html`: interfaccia, procedura guidata in 6 passi + archivio articoli. La valutazione resta nel browser (localStorage), esportabile/importabile in JSON. L'archivio articoli sta in `data/archivio-articoli.json` tramite `/api/articoli` di `../serve.js`; senza server, nel localStorage.
- `archivio.js`: funzioni pure dell'archivio (unione degli import per id, riepilogo per costruttore, filtri). Un valore cambiato rimette l'articolo "da verificare".
- `sistema.js`: lettore delle librerie SISTEMA `.slb` (database Firebird ODS 13) in puro JS, senza driver. Stesse regole di `../tools/slb2json.py`; verificato su Pizzato A26 contro Firebird 5 (206 articoli, 43 818 valori identici). Il file di prova non è nel repo (licenza).
- `vdma.js`: lettore dei database VDMA 66413 (`.xml`), con parser XML minimo interno. Un articolo per use case; B10d = B10 / RDF e MTTFd = MTTF / RDF quando il database dà B10/MTTF + RDF (calcolo scritto nella fonte). Verificato su Siemens vdma.xml 1.29.0 (1730 articoli) contro ElementTree di Python. `importaPacchetto` legge anche lo .zip del costruttore (XML + immagini).
- `zip.js`: lettore .zip minimo (stored/deflate via DecompressionStream). Immagini salvate da `../serve.js` in `data/immagini/<costruttore>/<file>` (`/api/immagini/...`), senza server in localStorage.
- `schema.js`: schema a blocchi del passo 2 (percorsi alternativi = righe, blocchi in serie; percorso vuoto = blocco comune). Funzioni pure, stessi percorsi di `evalFunction`.
- `engine.js`: motore di calcolo puro (UMD: `window.SafetyEngine` / `require`). Ogni costante cita la clausola della norma.
- `articoli.js`: archivio di partenza. Solo valori con fonte; oggi i 7 articoli S120 da Entry-ID 76254308 V2.1, con `verificato: false` finché non si confrontano col PDF.
- `build.js` → `safety-eval.html`: versione a file unico (incorpora tutti gli script) da consegnare (rigenerala dopo ogni modifica con `node build.js`).
- `test/`: `engine.test.js`, `archivio.test.js`, `sistema.test.js`, `vdma.test.js`, `zip.test.js`, `schema.test.js` (dati sintetici; `crea-zip.js` scrive gli .zip di prova). engine.test.js include i 4 casi di riferimento S120 (552, 840, 46, 92).

## Passi
1. Progetto e funzioni: PLr dal grafo del rischio (all. A).
2. Architettura: schema a blocchi interattivo. Ogni riga è un percorso (iniziatore alternativo, OR) con i blocchi in serie; i blocchi comuni (tratteggiati) stanno in tutti i percorsi; la funzione prende il percorso peggiore. Clic su un blocco → ruolo, percorso, metodo, categoria. Lo schema compare anche nel report.
3. Componenti: articoli dall'archivio filtrati per tipologia secondo il ruolo del sottosistema (ricerca e "tutte le tipologie" per allargare), quantità; per l'architettura designata canale, DC e dati d'uso per B10d.
4. Calcolo: MTTFd per canale (all. C, D.2, cap 100 anni, 2500 in cat. 4), DCavg (all. E), CCF (tab. F.1, ≥ 65), PFH da tab. K.1 inserito a mano.
5. Verifica: PL = min(PL da somma PFH, PL dei sottosistemi) ≥ PLr; serve almeno un sottosistema per rilevamento, logica e attuazione.
6. Report stampabile (PDF dal browser) con elenco fonti.

## Regole
- Nessun valore di catalogo o di tabella non verificato: la tab. K.1 NON è codificata (va inserita da una copia della norma), i campi mancanti restano vuoti e generano avvisi.
- PFH in 10⁻⁹/h, MTTFd/T10d in anni. I campi numerici sono di testo (`num()`): accettano la virgola decimale e la notazione E; un PFH sotto 0,001 è letto come 1/h e convertito (es. 4,29E-08 → 42,9). Niente `type=number`: il browser scartava la virgola (4,29 → 429).

## Da fare
- Tabella K.1 codificata (da copia della norma) per ricavare il PFH in automatico.
- Archivio reale dell'utente (Excel/CSV) da importare. PFH di F-CPU, F-DI, KTP900F: presenti nel vdma.xml Siemens, da confrontare con i certificati.
- Controllo coerenza tra categoria e PFH; misure contro errori sistematici; export Excel.
- Confronto risultati con SISTEMA / Safety Evaluation Tool.
