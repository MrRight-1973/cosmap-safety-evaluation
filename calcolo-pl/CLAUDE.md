# cosmap-safety-evaluation

Calcolatore del Performance Level (PL) / SIL per la funzione di emergenza di un impianto con azionamenti SINAMICS S120 comandati in PROFIsafe. Lingua di lavoro: italiano.

## Stato attuale
- `calcolo-pl.html`: prototipo a file singolo (HTML + JS, nessuna dipendenza, si apre nel browser). Contiene la logica in `<script id="calc">` (funzioni `pfhPerCU`, `pfhActuators`, `evaluate`, `toPL`) separata dall'interfaccia. Verificato nel browser con i casi sotto.
- Test di regressione: `node --test test/regressione.test.js` (estrae `<script id="calc">` e controlla i quattro casi sotto). Non c'è ancora git né il calcolo da B10d.

## L'impianto da modellare
- 12 Control Unit CU320-2 PN, 36 Double Motor Module booksize (3 per CU), 72 assi con motori brushless (1FK7). Funzioni Basic STO/SS1 via PROFIsafe (telegramma 30), nessun encoder di sicurezza.
- Rilevamento: funghi di emergenza a 2 canali su ingressi F-DI, più il pulsante del pannello KTP900F in PROFIsafe. Logica: F-CPU S7-1500F (modello esatto da confermare).
- Ipotesi di partenza: stessa zona di pericolo, quindi gli attuatori sono in serie.

## Regole di calcolo (fonte: Entry-ID 76254308, V2.1, 04/2024)
- Ogni CU è un sottosistema a parte: PFH_CU = PFH(CU) + somma dei PFH dei Motor Module reali che controllano assi di sicurezza. Il modulo doppio si conta una volta (conta se la sicurezza è su 1 o 2 assi).
- Valori [10⁻⁹/h]: CU320-2 PN 10; Motor Module singolo 10 (14 con SBC); doppio 2 assi usati 12 (20 con SBC, 16 con SBC su 1 asse); monitoraggio senza encoder Booksize 5. Mission time 20 anni.
- Il PFH Siemens non distingue le funzioni (STO, SS1...). Validità subordinata al test diagnostico previsto dai manuali.
- La somma sulle 12 CU NON è nel documento: viene da IEC 62061 / ISO 13849-1 (sottosistemi in serie si sommano) e vale solo se un'unica funzione dipende da tutte le CU, cioè se il guasto di una sola CU lascia il pericolo. Se ogni CU copre una zona distinta e documentata, ogni funzione ha il suo PFH.
- Pulsanti e pannello sono iniziatori alternativi (OR): ogni percorso = sensore + modulo d'ingresso + F-CPU + PROFIsafe + attuatori. Il PL della funzione è quello del percorso peggiore. F-CPU, bus e drive sono comuni.
- Soglie PFH [1/h]: PL e < 1e-7 (SIL 3); PL d < 1e-6 (SIL 2); PL c < 3e-6; PL b < 1e-5; PL a < 1e-4.

## Risultati di riferimento (solo attuatori, senza sensore e logica)
| Caso | PFH [10⁻⁹/h] | PL |
|---|---|---|
| 12 CU in serie, senza SBC | 552 | d |
| 12 CU in serie, SBC su tutti gli assi | 840 | d |
| una funzione per CU (6 assi) | 46 | e possibile |
| 2 CU in serie | 92 | e (poco margine) |
Usali come test di regressione quando cambi la logica.

## Da fare / dati mancanti
- PFH da certificato (non inventarli, ogni valore ha una fonte): F-CPU S7-1500F, modulo F-DI, KTP900F (variante), contributo PROFIsafe.
- Calcolo da B10d per pulsanti e contattori (MTTFd, DC, CCF, categoria) con le tabelle ISO 13849-1.
- Contattore comune a monte come secondo canale (Cat. 3/4) per puntare a PLr e.
- Controllo di coerenza PFH/categoria, archivio componenti con fonte e data, report esportabile (PDF/Excel).
- Decidere dove deve girare (pagina web, Excel, script) e chi lo usa. Verificare i risultati contro il Safety Evaluation Tool / SISTEMA prima di usarli in documenti di conformità.

## Documenti di riferimento (in `docs/`)
- `docs/S120_safety_fct_man_0620_en-US.pdf`: SINAMICS S120 Safety Integrated Function Manual 06/2020 (cap. 9.3 PFH, 9.4 tempi di risposta, 5.x funzioni Basic/Extended).
- `docs/76254308_Probability_of_failure_SINAMICS_V2.1.pdf`: tabelle PFH per componente (cap. 2.3 regole di somma, 3.16 S120 Built-In Units).

## Convenzioni
- PFH sempre in unità 10⁻⁹/h nei dati e nell'interfaccia, conversione a 1/h solo per il confronto con le soglie.
- Nessun valore di catalogo non verificato: se manca, il campo resta vuoto e l'interfaccia avvisa che è considerato 0.
