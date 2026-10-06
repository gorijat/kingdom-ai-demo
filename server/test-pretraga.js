require('dotenv').config();
const { pretraziProizvode, predloziProizvode } = require('./functions');

(async () => {
  for (const upit of [
    'nešto za video sastanke',
    'treba mi da prenesem veliki fajl brzo',
    'hladnjak za procesor',
    'zaštita od nestanka struje',
    'kamera za nadzor dvorišta'
  ]) {
    console.log(`\n--- ${upit} ---`);
    const rez = await pretraziProizvode({ upit });
    rez.forEach(r => console.log(`${r.skor}  ${r.naziv}`));
  }

  console.log('\n--- Predlozi za Jelenu (id 4) ---');
  (await predloziProizvode({ kupacId:4 })).forEach(r => console.log(`${r.skor}  ${r.naziv}`));

  console.log('\n--- Predlozi za Nikolu (id 3) ---');
  (await predloziProizvode({ kupacId:3 })).forEach(r => console.log(`${r.skor}  ${r.naziv}`));
})();