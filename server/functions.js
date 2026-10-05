const db = require('./db');
const faq = require('./dokumentacija');
const OpenAI = require('openai');
const { zabeleziPoziv } = require('./pracenje');
const { pozoviSaPonavljanjem } = require('./ponavljanje');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 0, // ponavljanje radi naš omotač, ne ugrađeni mehanizam
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

const kesEmbeddinga = new Map(); //vise proizvoda i upita ce se ponavljati, pa da ne generisemo embedding svaki put, nego da ga kesiramo

async function generisiEmbedding(tekst) {
    if (kesEmbeddinga.has(tekst)) {
        return kesEmbeddinga.get(tekst);
    }
    const pocetak = Date.now();
    const response = await pozoviSaPonavljanjem(
      () => openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: tekst,
      }),
      'embedding'
    );

    zabeleziPoziv({
      tip: 'embedding',
      model: 'text-embedding-3-small',
      korisnik: null,
      usage: response.usage,
      trajanjeMs: Date.now() - pocetak,
    });

    const embedding = response.data[0].embedding;
    kesEmbeddinga.set(tekst, embedding);
    return embedding;
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

function istorijaKupovine(kupacId, brojMeseci) {
    let upit = `
      SELECT proizvodi.naziv, porudzbine.kolicina, porudzbine.datum
      FROM porudzbine
      JOIN proizvodi ON porudzbine.proizvod_id = proizvodi.id
      WHERE porudzbine.kupac_id = ?
    `;
    const parametri = [kupacId];
  
    if (typeof brojMeseci === 'number' && brojMeseci > 0) {
      const granica = new Date();
      granica.setMonth(granica.getMonth() - brojMeseci);
      upit += ' AND porudzbine.datum >= ?';
      parametri.push(granica.toISOString().slice(0, 10));
    }
  
    upit += ' ORDER BY porudzbine.datum DESC';
    return db.prepare(upit).all(...parametri);
  }

//Function za istoriju kupovine i predlog kupovine na osnovu istorije kupovine, koristi embeddinge i kosinusnu slicnost

async function predloziProizvode(kupacId) {
    const kupljeni = db.prepare(`
      SELECT DISTINCT proizvodi.naziv, proizvodi.kategorija
      FROM porudzbine
      JOIN proizvodi ON porudzbine.proizvod_id = proizvodi.id
      WHERE porudzbine.kupac_id = ?
    `).all(kupacId);
  
    if (kupljeni.length === 0) {
      return { poruka: 'Kupac nema istoriju kupovine, nema osnova za predloge.' };
    }
  
    const profilTekst = kupljeni.map(p => `${p.naziv} ${p.kategorija}`).join(', ');
    const profilEmbedding = await generisiEmbedding(profilTekst);
  
    const kandidati = db.prepare(`  
      SELECT * FROM proizvodi
      WHERE id NOT IN (
        SELECT proizvod_id FROM porudzbine WHERE kupac_id = ?
      )
    `).all(kupacId);
  
    const saSkorom = [];
  
    for (const proizvod of kandidati) {
      const proizvodEmbedding = await generisiEmbedding(`${proizvod.naziv} ${proizvod.kategorija}`);
      const skor = cosinesSimilarity(profilEmbedding, proizvodEmbedding);
      saSkorom.push({
        naziv: proizvod.naziv,
        kategorija: proizvod.kategorija,
        cena: proizvod.cena,
        skor
      });
    }
  
    saSkorom.sort((a, b) => b.skor - a.skor);
    return saSkorom.slice(0, 5);
  }

//END istorija kupovine

module.exports = { pronadjiKupca, istorijaKupovine, pretraziProizvode, pretraziDokumentaciju, predloziProizvode };