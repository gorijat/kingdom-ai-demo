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

//Pomoćne funkcije za rad sa sačuvanim vektorima proizvoda

// Čita proizvode iz baze zajedno sa vektorima koje je upisala skripta generisi-embeddinge.js
function ucitajProizvodeSaVektorima() {
  const redovi = db.prepare('SELECT * FROM proizvodi').all();
  const bezEmbeddinga = redovi.filter(r => !r.embedding).length;

  if (bezEmbeddinga > 0) {
    throw new Error(
      `${bezEmbeddinga} proizvoda nema embedding. Pokreni: node generisi-embeddinge.js`
    );
  }

  return redovi.map(r => ({ ...r, embedding: JSON.parse(r.embedding) }));
}

// Prosek više vektora: "sredina" svega što je kupac kupio
function prosecanVektor(vektori) {
  const zbir = new Array(vektori[0].length).fill(0);
  for (const vektor of vektori) {
    for (let i = 0; i < vektor.length; i++) {
      zbir[i] += vektor[i];
    }
  }
  return zbir.map(x => x / vektori.length);
}

// Modelu vraćamo samo tekstualna polja, nikad sam vektor (1536 brojeva bi uzalud trošili tokene)
function bezVektora(proizvod, skor) {
  return {
    naziv: proizvod.naziv,
    kategorija: proizvod.kategorija,
    cena: proizvod.cena,
    opis: proizvod.opis,
    skor: Number(skor.toFixed(4))
  };
}

//END Pomoćne funkcije

//Embeding funkcija pretraga u bazi podataka (koristi unapred sačuvane vektore)

async function pretraziProizvode(upit) {
    const upitEmbedding = await generisiEmbedding(upit); // jedini poziv ka OpenAI-ju
    const sviProizvodi = ucitajProizvodeSaVektorima();

    const saSkorom = sviProizvodi.map(proizvod => ({
      proizvod,
      skor: cosinesSimilarity(upitEmbedding, proizvod.embedding)
    }));

    saSkorom.sort((a, b) => b.skor - a.skor);
    return saSkorom.slice(0, 5).map(s => bezVektora(s.proizvod, s.skor));
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

//Function za predlog kupovine na osnovu istorije kupovine, koristi sačuvane embeddinge i kosinusnu slicnost

async function predloziProizvode(kupacId) {
    const sviProizvodi = ucitajProizvodeSaVektorima();

    const kupljeniIds = db.prepare(
      'SELECT DISTINCT proizvod_id FROM porudzbine WHERE kupac_id = ?'
    ).all(kupacId).map(r => r.proizvod_id);

    if (kupljeniIds.length === 0) {
      return { poruka: 'Kupac nema istoriju kupovine, nema osnova za predloge.' };
    }

    // Profil kupca = prosek vektora svega što je kupio (bez ijednog poziva ka OpenAI-ju)
    const kupljeni = sviProizvodi.filter(p => kupljeniIds.includes(p.id));
    const profil = prosecanVektor(kupljeni.map(p => p.embedding));

    // Kandidati: sve što kupac još nije kupio
    const kandidati = sviProizvodi.filter(p => !kupljeniIds.includes(p.id));

    const saSkorom = kandidati.map(proizvod => ({
      proizvod,
      skor: cosinesSimilarity(profil, proizvod.embedding)
    }));

    saSkorom.sort((a, b) => b.skor - a.skor);
    return saSkorom.slice(0, 5).map(s => bezVektora(s.proizvod, s.skor));
  }

//END predlog kupovine


module.exports = { pronadjiKupca, istorijaKupovine, pretraziProizvode, pretraziDokumentaciju, predloziProizvode };