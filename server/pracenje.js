const fs = require('fs');
const path = require('path');

// Cene u dolarima po milion tokena. Proveri aktuelne na openai.com/api/pricing i ispravi ako se razlikuju.
const CENE = {
  'gpt-4o-mini': { ulaz: 0.15, izlaz: 0.60 },
  'text-embedding-3-small': { ulaz: 0.02, izlaz: 0 }
};

const LOG_FAJL = path.join(__dirname, 'ai-pozivi.log');

const ukupno = { pozivi: 0, ulazniTokeni: 0, izlazniTokeni: 0, troskovi: 0 };

function izracunajTrosak(model, ulazni, izlazni) {
  const cena = CENE[model];
  if (!cena) return 0;
  return (ulazni / 1000000) * cena.ulaz + (izlazni / 1000000) * cena.izlaz;
}

function zabeleziPoziv({ tip, model, korisnik, usage, trajanjeMs, alati }) {
  const ulazni = (usage && usage.prompt_tokens) || 0;
  const izlazni = (usage && usage.completion_tokens) || 0;
  const trosak = izracunajTrosak(model, ulazni, izlazni);

  ukupno.pozivi++;
  ukupno.ulazniTokeni += ulazni;
  ukupno.izlazniTokeni += izlazni;
  ukupno.troskovi += trosak;

  const zapis = {
    vreme: new Date().toISOString(),
    tip,
    model,
    korisnik: korisnik || null,
    ulazniTokeni: ulazni,
    izlazniTokeni: izlazni,
    trosakUSD: Number(trosak.toFixed(6)),
    trajanjeMs,
    alati: alati || []
  };

  try {
    fs.appendFileSync(LOG_FAJL, JSON.stringify(zapis) + '\n');
  } catch (err) {
    console.error('Neuspelo upisivanje u log:', err.message);
  }
}

function dajUkupno() {
  return { ...ukupno, troskovi: Number(ukupno.troskovi.toFixed(6)) };
}

module.exports = { zabeleziPoziv, dajUkupno };