const db = require('./db');

function pronadjiKupca(ime) {
  const stmt = db.prepare('SELECT * FROM kupci WHERE ime LIKE ?');
  return stmt.all(`%${ime}%`);
}

function istorijaKupovine(kupacId) {
  const stmt = db.prepare(`
    SELECT proizvodi.naziv, porudzbine.kolicina, porudzbine.datum
    FROM porudzbine
    JOIN proizvodi ON porudzbine.proizvod_id = proizvodi.id
    WHERE porudzbine.kupac_id = ?
    ORDER BY porudzbine.datum DESC
  `);
  return stmt.all(kupacId);
}

module.exports = { pronadjiKupca, istorijaKupovine };