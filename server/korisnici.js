const korisnici = {
  'tajna-prodaja-1': { ime: 'Marko iz prodaje', uloga: 'prodaja' },
  'tajna-prodaja-1': { ime: 'Maksim iz prodaje', uloga: 'prodaja' },
  'tajna-podrska-1': { ime: 'Ana iz podrške', uloga: 'podrska' }
};

const dozvoljeniAlati = {
  prodaja: ['pronadjiKupca', 'istorijaKupovine', 'pretraziProizvode', 'pretraziDokumentaciju', 'predloziProizvode'],
  podrska: ['pretraziProizvode', 'pretraziDokumentaciju']
};

const loginPodaci = {
  marko: { lozinka: 'prodaja123', token: 'tajna-prodaja-1' },
  maksim: { lozinka: 'prodaja1234', token: 'tajna-prodaja-1' },
  ana: { lozinka: 'podrska123', token: 'tajna-podrska-1' }
};

module.exports = { korisnici, dozvoljeniAlati, loginPodaci };