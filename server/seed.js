const db = require('./db');
const proizvodi = require('./katalog');

db.prepare('DELETE FROM porudzbine').run();
db.prepare('DELETE FROM kupci').run();
db.prepare('DELETE FROM proizvodi').run();
db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('kupci', 'proizvodi', 'porudzbine')").run();

const kupci = [
  { ime: 'Marko Petrović', email: 'marko@example.com' },
  { ime: 'Ana Jovanović', email: 'ana@example.com' },
  { ime: 'Nikola Ilić', email: 'nikola@example.com' },
  { ime: 'Jelena Marković', email: 'jelena@example.com' }
];

const dodajKupca = db.prepare('INSERT INTO kupci (ime, email) VALUES (?, ?)');
const kupacIds = kupci.map(k => dodajKupca.run(k.ime, k.email).lastInsertRowid);

const dodajProizvod = db.prepare('INSERT INTO proizvodi (naziv, kategorija, cena, opis) VALUES (?, ?, ?, ?)');
const proizvodIds = proizvodi.map(p => dodajProizvod.run(p.naziv, p.kategorija, p.cena, p.opis).lastInsertRowid);

const dodajPorudzbinu = db.prepare(
  'INSERT INTO porudzbine (kupac_id, proizvod_id, kolicina, datum) VALUES (?, ?, ?, ?)'
);

// [indeks kupca, indeks proizvoda, količina, datum]
// Prvih 20 proizvoda iz kataloga je isto kao ranije, pa indeksi ostaju validni.
const porudzbine = [
  [0, 0, 2, '2026-06-15'],
  [0, 1, 1, '2026-07-01'],
  [0, 13, 1, '2026-01-10'],
  [1, 6, 1, '2026-05-20'],
  [1, 4, 1, '2026-08-05'],
  [1, 5, 1, '2026-08-05'],
  [2, 2, 1, '2026-04-12'],
  [2, 10, 1, '2026-04-12'],
  [2, 8, 1, '2026-09-01'],
  [3, 14, 1, '2026-07-22'],
  [3, 12, 1, '2026-08-18']
];

for (const [k, p, kolicina, datum] of porudzbine) {
  dodajPorudzbinu.run(kupacIds[k], proizvodIds[p], kolicina, datum);
}

console.log(`Baza je uspešno popunjena: ${proizvodi.length} proizvoda, ${kupci.length} kupca, ${porudzbine.length} porudžbina.`);