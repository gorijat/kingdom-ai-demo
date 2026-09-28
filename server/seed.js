const db = require('./db');

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

const proizvodi = [
  { naziv: 'Mehanička tastatura', kategorija: 'periferije', cena: 89.99 },
  { naziv: 'Bežični miš', kategorija: 'periferije', cena: 29.99 },
  { naziv: 'Gejmerski miš RGB', kategorija: 'periferije', cena: 49.99 },
  { naziv: 'Podloga za miš XL', kategorija: 'periferije', cena: 19.99 },
  { naziv: 'Web kamera Full HD', kategorija: 'periferije', cena: 59.99 },
  { naziv: 'USB mikrofon', kategorija: 'periferije', cena: 79.99 },
  { naziv: '27-inčni monitor', kategorija: 'monitori', cena: 249.99 },
  { naziv: '24-inčni monitor', kategorija: 'monitori', cena: 159.99 },
  { naziv: 'Ultrawide monitor 34 inča', kategorija: 'monitori', cena: 449.99 },
  { naziv: 'Bluetooth slušalice', kategorija: 'audio', cena: 69.99 },
  { naziv: 'Gejmerske slušalice 7.1', kategorija: 'audio', cena: 89.99 },
  { naziv: 'Zvučnici 2.0', kategorija: 'audio', cena: 39.99 },
  { naziv: 'Eksterni SSD 1TB', kategorija: 'skladištenje', cena: 99.99 },
  { naziv: 'USB flash 128GB', kategorija: 'skladištenje', cena: 14.99 },
  { naziv: 'WiFi ruter AC1200', kategorija: 'mreža', cena: 54.99 },
  { naziv: 'Mrežni kabl Cat6 10m', kategorija: 'mreža', cena: 8.99 },
  { naziv: 'Grafička kartica RTX 4060', kategorija: 'komponente', cena: 329.99 },
  { naziv: 'RAM memorija 16GB DDR4', kategorija: 'komponente', cena: 49.99 },
  { naziv: 'Stalak za laptop', kategorija: 'dodaci', cena: 24.99 },
  { naziv: 'USB hub 7 portova', kategorija: 'dodaci', cena: 22.99 }
];

const dodajKupca = db.prepare('INSERT INTO kupci (ime, email) VALUES (?, ?)');
const kupacIds = kupci.map(k => dodajKupca.run(k.ime, k.email).lastInsertRowid);

const dodajProizvod = db.prepare('INSERT INTO proizvodi (naziv, kategorija, cena) VALUES (?, ?, ?)');
const proizvodIds = proizvodi.map(p => dodajProizvod.run(p.naziv, p.kategorija, p.cena).lastInsertRowid);

const dodajPorudzbinu = db.prepare(
  'INSERT INTO porudzbine (kupac_id, proizvod_id, kolicina, datum) VALUES (?, ?, ?, ?)'
);

// [indeks kupca, indeks proizvoda, količina, datum]
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

console.log('Baza je uspešno popunjena test podacima.');