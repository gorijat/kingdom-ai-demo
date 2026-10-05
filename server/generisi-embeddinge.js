// Jednokratna skripta: računa embedding za svaki proizvod i čuva ga u bazi.
// Pokreće se posle seed.js, i ponovo kad se katalog promeni.
require('dotenv').config();
const OpenAI = require('openai');
const db = require('./db');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = 'text-embedding-3-small';
const VELICINA_GRUPE = 100; // koliko tekstova šaljemo u jednom pozivu

// Migracija: ako kolona embedding još ne postoji, dodajemo je
const kolone = db.prepare('PRAGMA table_info(proizvodi)').all().map(k => k.name);
if (!kolone.includes('embedding')) {
  db.prepare('ALTER TABLE proizvodi ADD COLUMN embedding TEXT').run();
  console.log('Dodata kolona embedding u tabelu proizvodi.');
}

// Ovaj tekst se pretvara u vektor: naziv + kategorija + opis
function tekstZaEmbedding(p) {
  return `${p.naziv}. Kategorija: ${p.kategorija}. ${p.opis}`;
}

async function main() {
  const proizvodi = db.prepare('SELECT id, naziv, kategorija, opis FROM proizvodi ORDER BY id').all();
  const upisi = db.prepare('UPDATE proizvodi SET embedding = ? WHERE id = ?');

  console.log(`Računam embeddinge za ${proizvodi.length} proizvoda...`);
  let ukupnoTokena = 0;

  for (let i = 0; i < proizvodi.length; i += VELICINA_GRUPE) {
    const grupa = proizvodi.slice(i, i + VELICINA_GRUPE);

    const response = await openai.embeddings.create({
      model: MODEL,
      input: grupa.map(tekstZaEmbedding),
    });

    ukupnoTokena += response.usage.total_tokens;

    // Rezultati stižu istim redosledom kao ulazni tekstovi
    response.data.forEach((stavka, j) => {
      upisi.run(JSON.stringify(stavka.embedding), grupa[j].id);
    });

    console.log(`  gotovo ${Math.min(i + VELICINA_GRUPE, proizvodi.length)} / ${proizvodi.length}`);
  }

  const trosak = (ukupnoTokena / 1_000_000) * 0.02;
  console.log(`Završeno. Potrošeno tokena: ${ukupnoTokena} (oko $${trosak.toFixed(5)}).`);
}

main().catch(err => {
  console.error('Greška:', err.message);
  process.exit(1);
});