const korisnici = {
    'tajna-prodaja-1': { ime: 'Marko iz prodaje', uloga: 'prodaja' },
    'tajna-podrska-1': { ime: 'Ana iz podrške', uloga: 'podrska' }
  };
  
  const dozvoljeniAlati = {
    prodaja: ['pronadjiKupca', 'istorijaKupovine', 'pretraziProizvode', 'pretraziDokumentaciju', 'predloziProizvode'],
    podrska: ['pretraziProizvode', 'pretraziDokumentaciju']
  };
  
  module.exports = { korisnici, dozvoljeniAlati };