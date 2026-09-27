const db = require('./db');
const faq = require('./dokumentacija');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

//Cosine similarity function kosinusna slicnost koja vraca vrednost slicnosti izmedju dva vektora od -1 do 1, gde 1 znaci da su vektori identicni, 0 znaci da su ortogonalni (nema slicnosti), a -1 znaci da su potpuno suprotni.

function cosinesSimilarity(vektorA, vektorB) {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
  
    for (let i = 0; i < vektorA.length; i++) {
      dotProduct += vektorA[i] * vektorB[i];
      magnitudeA += vektorA[i] * vektorA[i];
      magnitudeB += vektorB[i] * vektorB[i];
    }
  
    return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
  }

//END Cosine similarity function

//Function za generisanje embedinga

async function generisiEmbedding(tekst) {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: tekst,
    });
    return response.data[0].embedding;
  }

//END Function za generisanje embedinga

//Embeding funkcija pretraga u bazi podataka

async function pretraziProizvode(upit) {
    const upitEmbedding = await generisiEmbedding(upit);
    const sviProizvodi = db.prepare('SELECT * FROM proizvodi').all();
  
    const saSkorom = [];
  
    for (const proizvod of sviProizvodi) { //generisanje embedinga za svaki proizvod u bazi podataka, da imamo 100+ proizvoda ovo bi izracunali unapred
      const proizvodEmbedding = await generisiEmbedding(`${proizvod.naziv} ${proizvod.kategorija}`);
      const skor = cosinesSimilarity(upitEmbedding, proizvodEmbedding);
      saSkorom.push({ ...proizvod, skor });
    }
  
    saSkorom.sort((a, b) => b.skor - a.skor);
    return saSkorom.slice(0, 3);
  }

//END Embeding pretraga u bazi podataka

//FAQ pretraga dokumentacije

async function pretraziDokumentaciju(upit) {
    const upitEmbedding = await generisiEmbedding(upit);
  
    const saSkorom = [];
  
    for (const stavka of faq) {
      const stavkaEmbedding = await generisiEmbedding(`${stavka.naslov} ${stavka.tekst}`);
      const skor = cosinesSimilarity(upitEmbedding, stavkaEmbedding);
      saSkorom.push({ ...stavka, skor });
    }
  
    saSkorom.sort((a, b) => b.skor - a.skor);
    return saSkorom.slice(0, 2);
  }


//END FAQ pretraga dokumentacije

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

module.exports = { pronadjiKupca, istorijaKupovine, pretraziProizvode, pretraziDokumentaciju };