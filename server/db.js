const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'kingdom.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS kupci (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ime TEXT NOT NULL,
    email TEXT
  );

  CREATE TABLE IF NOT EXISTS proizvodi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    naziv TEXT NOT NULL,
    kategorija TEXT,
    cena REAL,
    opis TEXT
  );

  CREATE TABLE IF NOT EXISTS porudzbine (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kupac_id INTEGER NOT NULL,
    proizvod_id INTEGER NOT NULL,
    kolicina INTEGER NOT NULL,
    datum TEXT NOT NULL,
    FOREIGN KEY (kupac_id) REFERENCES kupci(id),
    FOREIGN KEY (proizvod_id) REFERENCES proizvodi(id)
  );
`);

module.exports = db;