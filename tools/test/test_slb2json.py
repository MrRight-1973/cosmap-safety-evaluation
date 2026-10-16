# Test della conversione senza Firebird: righe finte con valori di prova.
# Esecuzione: python3 -m unittest discover -s tools/test
import datetime
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from slb2json import converti

META = {'NAME': 'Prova [locked]', 'AUTHOR': 'Costruttore Prova S.r.l.', 'LIBVERSION': 'A1',
        'LASTCHANGE': datetime.datetime(2026, 1, 2, 3, 4)}
COMP = [
    {'OID': '{AA-1}', 'NAME': 'CS X-01 modulo', 'PFH': 2.5e-9, 'DEVICEGROUP': 'CS', 'PARTNO': '', 'CAT': 'cat4', 'MISSIONTIME': 20.0},
    {'OID': '{AA-2}', 'NAME': 'senza valore', 'PFH': -2.0, 'DEVICEGROUP': 'ZZ', 'PARTNO': '', 'CAT': 'cat3', 'MISSIONTIME': 20.0},
]
ELEM = [
    {'OID': '{BB-1}', 'NAME': 'F• ••92 interruttore', 'B10D': 2e6, 'MTTFD': 10.0, 'MTTFDDET': 'detB10D', 'DEVICEGROUP': 'F• ••92', 'PARTNO': ''},
    {'OID': '{BB-2}', 'NAME': 'elettronico', 'B10D': 0.0, 'MTTFD': 150.0, 'MTTFDDET': 'detDirect', 'DEVICEGROUP': 'E', 'PARTNO': 'E-1'},
    {'OID': '{BB-3}', 'NAME': 'da lambda', 'B10D': 0.0, 'MTTFD': 50.0, 'MTTFDDET': 'detMTTF', 'DEVICEGROUP': 'L', 'PARTNO': ''},
]


class Converti(unittest.TestCase):
    def setUp(self):
        self.art, self.scartati = converti(META, COMP, ELEM)
        self.by = {a['id']: a for a in self.art}

    def test_pfh_convertito_in_nano(self):
        a = self.by['costruttore-aa-1']
        self.assertEqual(a['pfh'], 2.5)
        self.assertEqual(a['tipo'], 'logica')
        self.assertIn('cat. 4', a['fonte'])

    def test_b10d_e_mttfd(self):
        self.assertEqual(self.by['costruttore-bb-1']['b10d'], 2e6)
        self.assertIsNone(self.by['costruttore-bb-1']['mttfd'])
        self.assertEqual(self.by['costruttore-bb-2']['mttfd'], 150.0)
        self.assertEqual(self.by['costruttore-bb-1']['codice'], 'F* **92')

    def test_scartati_e_non_verificati(self):
        self.assertEqual(len(self.art), 3)
        self.assertEqual(len(self.scartati), 2)
        self.assertTrue(all(a['verificato'] is False and a['fonte'] and a['dataFonte'] == '2026-01-02' for a in self.art))


if __name__ == '__main__':
    unittest.main()
