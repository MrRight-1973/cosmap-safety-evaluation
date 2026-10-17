# safety-eval

Web app statica (HTML + JS, nessuna dipendenza; con `npm start` il server locale salva l'archivio su file) che guida passo passo una safety evaluation secondo ISO 13849-1 partendo da un archivio articoli. Lingua: italiano. Deriva dal calcolatore in `../calcolo-pl/`. Test di tutto il repository: `npm test` dalla radice.

## File
- `index.html`: interfaccia, procedura guidata in 7 passi + archivio articoli. La valutazione resta nel browser (localStorage), esportabile/importabile in JSON. L'archivio articoli sta in `data/archivio-articoli.json` tramite `/api/articoli` di `../serve.js`; senza server, nel localStorage.
- `archivio.js`: funzioni pure dell'archivio (unione degli import per id, riepilogo per costruttore, filtri). Un valore cambiato rimette l'articolo "da verificare".
- `sistema.js`: lettore delle librerie SISTEMA `.slb` (database Firebird ODS 13) in puro JS, senza driver. Stesse regole di `../tools/slb2json.py`; verificato su Pizzato A26 contro Firebird 5 (206 articoli, 43 818 valori identici). Il file di prova non è nel repo (licenza).
- `vdma.js`: lettore dei database VDMA 66413 (`.xml`), con parser XML minimo interno. Un articolo per use case; B10d = B10 / RDF e MTTFd = MTTF / RDF quando il database dà B10/MTTF + RDF (calcolo scritto nella fonte). Verificato su Siemens vdma.xml 1.29.0 (1730 articoli) contro ElementTree di Python. `importaPacchetto` legge anche lo .zip del costruttore (XML + immagini).
- `zip.js`: lettore .zip minimo (stored/deflate via DecompressionStream). Immagini salvate da `../serve.js` in `data/immagini/<costruttore>/<file>` (`/api/immagini/...`), senza server in localStorage.
- `schema.js`: schema a blocchi del passo 2 (percorsi alternativi = righe, blocchi in serie; percorso vuoto = blocco comune). Funzioni pure, stessi percorsi di `evalFunction`.
- `validazione.js`: liste di controllo senza valori numerici. `MISURE_SISTEMATICHE` (ISO 13849-1 all. G e software di sicurezza) e `proveAuto(f)`, le prove di validazione ISO 13849-2 ricavate dallo schema: una prova funzionale per percorso, tempo di risposta, reset, guasto e cortocircuito per i blocchi in cat. 3/4, test periodico in cat. 2, parametri per i blocchi "PFH da certificato". Gli esiti stanno in `f.validazione.esiti[chiave]`, le prove aggiunte a mano in `f.validazione.extra`, le misure in `S.sistematiche`. `PROVE_ELETTRICHE`: verifiche IEC 60204-1:2016 cap. 18 (18.2.2 continuità PE, 18.2.3 anello di guasto, 18.3 isolamento, 18.4 prova di tensione, 18.5 tensioni residue, 18.6 funzionali) con criterio riassunto e clausola, in `S.elettriche` (valore misurato, esito, punti aggiunti, strumento e taratura). I criteri sono riassunti dalla norma senza copia a disposizione: da confrontare con il testo ufficiale, come la tab. K.1.
- `engine.js`: motore di calcolo puro (UMD: `window.SafetyEngine` / `require`). Ogni costante cita la clausola della norma.
- `articoli.js`: archivio di partenza. Solo valori con fonte; oggi i 7 articoli S120 da Entry-ID 76254308 V2.1, con `verificato: false` finché non si confrontano col PDF.
- `build.js` → `safety-eval.html`: versione a file unico (incorpora tutti gli script) da consegnare (rigenerala dopo ogni modifica con `node build.js`).
- `test/`: `engine.test.js`, `archivio.test.js`, `sistema.test.js`, `vdma.test.js`, `zip.test.js`, `schema.test.js`, `validazione.test.js` (dati sintetici; `crea-zip.js` scrive gli .zip di prova). engine.test.js include i 4 casi di riferimento S120 (552, 840, 46, 92).

## Passi
1. Progetto e funzioni: PLr dal grafo del rischio (all. A), disegnato in SVG con il percorso scelto evidenziato (anche nel report).
2. Architettura: schema a blocchi interattivo. Ogni riga è un percorso (iniziatore alternativo, OR) con i blocchi in serie; i blocchi comuni (tratteggiati) stanno in tutti i percorsi e, se sono tutti in coda, si disegnano una volta sola con i percorsi che vi confluiscono (`Schema.confluenza`), altrimenti si ripetono in ogni riga; la funzione prende il percorso peggiore. Clic su un blocco → ruolo, percorso, metodo, categoria. Lo schema compare anche nel report.
3. Componenti: sottosistemi raggruppati per percorso e poi i comuni, nell'ordine dello schema (`Schema.gruppi`, stesso ordine nel passo 4); articoli dall'archivio filtrati per tipologia secondo il ruolo del sottosistema (ricerca e "tutte le tipologie" per allargare), quantità; per l'architettura designata canale, DC e dati d'uso per B10d.
4. Calcolo: MTTFd per canale (all. C, D.2, cap 100 anni, 2500 in cat. 4), DCavg (all. E), CCF (tab. F.1, ≥ 65), PFH dalla tab. K.1 (`pfhK1` in engine.js: riga MTTFd immediatamente inferiore; DC alta in cat. 2/3 → colonna DC media; oltre 100 anni → riga 100), sovrascrivibile a mano con avviso se diverso.
5. Verifica: PL = min(PL da somma PFH, PL dei sottosistemi) ≥ PLr; serve almeno un sottosistema per rilevamento, logica e attuazione.
6. Guasti sistematici e validazione: checklist delle misure (esito, note), versione e firma del programma F, poi per ogni funzione la tabella delle prove (esito OK / non OK / non applicabile, note, prove aggiunte a mano), chi la esegue e la data. La funzione è validata quando ogni prova applicabile è OK. In fondo le verifiche elettriche dell'equipaggiamento (IEC 60204-1, cap. 18).
7. Report come documento da firmare: intestazione (n. documento, revisione, data), riepilogo funzioni, tabella firme Redatto/Verificato/Approvato (dati nel passo 1), poi un capitolo per funzione (PLr con grafo, schema, verifica, validazione su pagina propria con riga per la firma di chi la esegue), misure contro i guasti sistematici, verifiche elettriche con riga per la firma, componenti e fonti. Le prove non compilate restano vuote, da completare a mano sul foglio. "Esporta PDF da firmare" = stampa del browser con CSS @page A4 (piè di pagina con documento e numero pagina; ogni funzione su pagina nuova). Nessun pulsante avanti/indietro: si naviga con le schede in alto.

## Regole
- Nessun valore di catalogo o di tabella non verificato; i campi mancanti restano vuoti e generano avvisi.
- Tab. K.1 trascritta da "Calcolo Performance Level" (Wide Automation, 2021), che riporta la tabella della norma fino a 100 anni (manca l'estensione della cat. 4 fino a 2500 anni). Il test controlla ogni valore contro la colonna PL della tabella e la monotonia: se si corregge un valore, aggiornare anche `K1_PL` nel test.
- PFH in 10⁻⁹/h, MTTFd/T10d in anni. I campi numerici sono di testo (`num()`): accettano la virgola decimale e la notazione E; un PFH sotto 0,001 è letto come 1/h e convertito (es. 4,29E-08 → 42,9). Niente `type=number`: il browser scartava la virgola (4,29 → 429).

## Da fare
- Confrontare i criteri delle verifiche elettriche (IEC 60204-1 cap. 18) con il testo ufficiale.
- Confrontare la tab. K.1 trascritta con una copia ufficiale della norma (fonte attuale secondaria).
- Archivio reale dell'utente (Excel/CSV) da importare. PFH di F-CPU, F-DI, KTP900F: presenti nel vdma.xml Siemens, da confrontare con i certificati.
- Controllo coerenza tra categoria e PFH; export Excel.
- Confronto risultati con SISTEMA / Safety Evaluation Tool.
