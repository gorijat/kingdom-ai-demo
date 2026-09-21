const db = require('./db');

const brisiSve = db.prepare('DELETE FROM porudzbine');
brisiSve.run();
db.prepare('DELETE FROM kupci').run();
db.prepare('DELETE FROM proizvodi').run();

const dodajKupca = db.prepare('INSERT INTO kupci (ime, email) VALUES (?, ?)');
const kupacMarko = dodajKupca.run('Marko Petrović', 'marko@example.com');
const kupacAna = dodajKupca.run('Ana Jovanović', 'ana@example.com');

const dodajProizvod = db.prepare('INSERT INTO proizvodi (naziv, kategorija, cena) VALUES (?, ?, ?)');
const tastatura = dodajProizvod.run('Mehanička tastatura', 'periferije', 89.99);
const misx = dodajProizvod.run('Bežični miš', 'periferije', 29.99);
const monitor = dodajProizvod.run('27-inčni monitor', 'monitori', 249.99);

const dodajPorudzbinu = db.prepare(
  'INSERT INTO porudzbine (kupac_id, proizvod_id, kolicina, datum) VALUES (?, ?, ?, ?)'
);

dodajPorudzbinu.run(kupacMarko.lastInsertRowid, tastatura.lastInsertRowid, 2, '2026-06-15');
dodajPorudzbinu.run(kupacMarko.lastInsertRowid, misx.lastInsertRowid, 1, '2026-07-01');
dodajPorudzbinu.run(kupacAna.lastInsertRowid, monitor.lastInsertRowid, 1, '2026-05-20');

console.log('Baza je uspešno popunjena test podacima.');