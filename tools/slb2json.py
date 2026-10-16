"""Converte una libreria SISTEMA (.slb) nel formato dell'archivio articoli della web app.

Una libreria .slb è un database Firebird (ODS 13). Il file viene copiato in una cartella
temporanea e letto da lì: l'originale non viene mai modificato.

Uso:
    python tools/slb2json.py LIBRERIA.slb USCITA.json --firebird CARTELLA_FIREBIRD

CARTELLA_FIREBIRD è la cartella di Firebird 4 o 5 scompattata (non serve installarlo);
in alternativa si imposta la variabile d'ambiente FIREBIRD. Serve `pip install firebird-driver`.

Il JSON prodotto si carica nell'app da Archivio articoli → Importa archivio.
Ogni articolo entra con verificato = False e con la libreria come fonte.
"""
import argparse
import json
import os
import re
import shutil
import sys
import tempfile

NOTA = "Importato da libreria SISTEMA: confrontare con la documentazione del costruttore prima dell'uso."


def pulisci(s):
    return re.sub(r'\s+', ' ', (s or '').replace('•', '*')).strip()


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:20] or 'sistema'


def converti(meta, componenti, elementi):
    """Righe lette dal database → (articoli, scartati). Funzione pura, testabile senza Firebird.

    meta: NAME, AUTHOR, LIBVERSION, LASTCHANGE (datetime).
    componenti: sottosistemi con PFH [1/h]: OID, NAME, PFH, DEVICEGROUP, PARTNO, CAT, MISSIONTIME.
    elementi: elementi di primo livello: OID, NAME, B10D, MTTFD, MTTFDDET, DEVICEGROUP, PARTNO.
    """
    produttore = pulisci(meta['AUTHOR'])
    lib = f"{produttore}, libreria SISTEMA \"{pulisci(meta['NAME'])}\" versione {pulisci(meta['LIBVERSION'])}"
    data = meta['LASTCHANGE'].strftime('%Y-%m-%d')
    pref = slug(produttore.split(' ')[0])
    articoli, scartati = [], []

    def base(r):
        nome = pulisci(r['NAME'])
        return {'id': f"{pref}-{r['OID'].strip('{}').lower()}", 'codice': pulisci(r['PARTNO'] or r['DEVICEGROUP']) or nome,
                'descrizione': nome, 'produttore': produttore, 'pfh': None, 'b10d': None, 'mttfd': None,
                'plMax': None, 'dataFonte': data, 'verificato': False, 'note': NOTA}

    for r in componenti:
        if not (r['PFH'] and r['PFH'] > 0):  # -2 = valore non definito in SISTEMA
            scartati.append(('sottosistema senza PFH', pulisci(r['NAME'])))
            continue
        a = base(r)
        a['tipo'] = 'logica' if (r['DEVICEGROUP'] or '').startswith('CS') else 'sensore'
        a['pfh'] = round(r['PFH'] * 1e9, 6)  # 1/h → 10⁻⁹/h
        cat = (r['CAT'] or '').strip().replace('cat', '')
        a['fonte'] = f"{lib}, sottosistema \"{a['descrizione']}\" (cat. {cat}, mission time {r['MISSIONTIME']:g} anni)"
        articoli.append(a)

    for r in elementi:
        a = base(r)
        a['tipo'] = 'sensore'
        if r['MTTFDDET'] == 'detB10D' and r['B10D'] and r['B10D'] > 0:
            a['b10d'] = r['B10D']
        elif r['MTTFDDET'] == 'detDirect' and r['MTTFD'] and r['MTTFD'] > 0:
            a['mttfd'] = r['MTTFD']
        else:  # MTTFd calcolato da λ, MTTF o sotto-elementi: non lo ricostruiamo
            scartati.append((f"elemento con determinazione {r['MTTFDDET']}", a['descrizione']))
            continue
        a['fonte'] = f"{lib}, elemento \"{a['descrizione']}\""
        articoli.append(a)
    return articoli, scartati


def leggi(percorso, firebird):
    from firebird.driver import connect, driver_config
    nome = 'fbclient.dll' if os.name == 'nt' else os.path.join('lib', 'libfbclient.so')
    driver_config.fb_client_library.value = os.path.join(firebird, nome)
    tmp = os.path.join(tempfile.mkdtemp(), 'libreria.fdb')
    shutil.copy(percorso, tmp)
    con = connect(tmp, user='SYSDBA', charset='UTF8')
    try:
        cur = con.cursor()

        def q(sql):
            cur.execute(sql)
            cols = [d[0] for d in cur.description]
            return [dict(zip(cols, r)) for r in cur.fetchall()]

        meta = q("select NAME, AUTHOR, LIBVERSION, LASTCHANGE from LIBMETADATA")[0]
        comp = q("""select c.OID, c.NAME, c.PFH, d.DEVICEGROUP, d.PARTNO, d.CAT, d.MISSIONTIME
                    from COMPONENTOPS c join METADEVICECOMPONENTS d on d.OID = c.METADEVICEOID
                    where c.SFOPOID is null""")
        elem = q("""select e.OID, e.NAME, e.B10D, e.MTTFD, e.MTTFDDET, d.DEVICEGROUP, d.PARTNO
                    from ELEMENTOPS e join METADEVICEELEMENTS d on d.OID = e.METADEVICEOID
                    where e.PARENTOPOID is null""")
        cur.close()
        return meta, comp, elem
    finally:
        con.close()
        shutil.rmtree(os.path.dirname(tmp), ignore_errors=True)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('libreria')
    p.add_argument('uscita')
    p.add_argument('--firebird', default=os.environ.get('FIREBIRD'), help='cartella di Firebird 4/5')
    a = p.parse_args()
    if not a.firebird:
        sys.exit('Indica la cartella di Firebird con --firebird o con la variabile FIREBIRD.')
    articoli, scartati = converti(*leggi(a.libreria, a.firebird))
    with open(a.uscita, 'w', encoding='utf-8') as f:
        json.dump(articoli, f, ensure_ascii=False, indent=1)
    print(f"{len(articoli)} articoli scritti in {a.uscita}: "
          f"{sum(x['pfh'] is not None for x in articoli)} con PFH, "
          f"{sum(x['b10d'] is not None for x in articoli)} con B10d, "
          f"{sum(x['mttfd'] is not None for x in articoli)} con MTTFd; {len(scartati)} scartati.")
    for motivo, nome in scartati:
        print(f"  scartato ({motivo}): {nome}")


if __name__ == '__main__':
    main()
