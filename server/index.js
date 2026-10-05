require('dotenv').config();
const express = require('express');
const cors = require('cors');

const OpenAI = require('openai');

const {
  pronadjiKupca,
  istorijaKupovine,
  pretraziProizvode,
  pretraziDokumentaciju,
  predloziProizvode
} = require('./functions');

const { korisnici, dozvoljeniAlati, loginPodaci } = require('./korisnici');

const { zabeleziPoziv, dajUkupno } = require('./pracenje');

const { pozoviSaPonavljanjem } = require('./ponavljanje');

const rateLimit = require('express-rate-limit');

const openai = new OpenAI({ // Klijent za OpenAI API
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 0, // ponavljanje radi naš omotač, ne ugrađeni mehanizam
});

// Definicija alata koje AI može da koristi
const tools = [
  {
    type: 'function',
    function: {
      name: 'pronadjiKupca',
      description: 'Pronalazi kupca po imenu ili delu imena i vraća njegove osnovne podatke (id, ime, email).',
      parameters: {
        type: 'object',
        properties: {
          ime: {
            type: 'string',
            description: 'Ime ili deo imena kupca koji se traži'
          }
        },
        required: ['ime']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'istorijaKupovine',
      description: 'Vraća listu proizvoda koje je kupac naručio, sortiranu od najnovije ka najstarijoj kupovini. Opcionalno ograničava na poslednjih N meseci.',
      parameters: {
        type: 'object',
        properties: {
          kupacId: {
            type: 'number',
            description: 'ID kupca čija se istorija kupovine traži'
          },
          brojMeseci: {
            type: 'number',
            description: 'Opciono: prikaži samo kupovine iz poslednjih N meseci'
          }
        },
        required: ['kupacId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'pretraziProizvode',
      description: 'Pretražuje katalog proizvoda po značenju upita (semantic search), ne po tačnom nazivu. Koristi kad korisnik opisuje šta mu treba, a ne zna tačan naziv proizvoda.',
      parameters: {
        type: 'object',
        properties: {
          upit: {
            type: 'string',
            description: 'Pun opis proizvoda koji se traži: navedi vrstu proizvoda i njegovu namenu, npr. "IP kamera za video nadzor dvorišta", a ne samo "nadzor dvorišta". Ne koristi pojedinačne reči.'
          }
        },
        required: ['upit']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'pretraziDokumentaciju',
      description: 'Pretražuje internu dokumentaciju firme (FAQ, pravilnike o povraćaju, garanciji, dostavi) po značenju upita. Koristi kad korisnik pita o pravilima, politikama, ili proceduri firme.',
      parameters: {
        type: 'object',
        properties: {
          upit: {
            type: 'string',
            description: 'Pitanje korisnika o internim pravilima ili procedurama, prirodnim jezikom'
          }
        },
        required: ['upit']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'predloziProizvode',
      description: 'Predlaže proizvode koje kupac još nije kupovao, na osnovu sličnosti sa njegovom istorijom kupovine. Zahteva ID kupca, pa kupca prvo treba pronaći.',
      parameters: {
        type: 'object',
        properties: {
          kupacId: {
            type: 'number',
            description: 'ID kupca kome se predlažu proizvodi'
          }
        },
        required: ['kupacId']
      }
    }
  }
];
// END Definicija alata

const dostupneFunkcije = { // povezuje nazive funkcija sa stvarnim implementacijama
  pronadjiKupca,
  istorijaKupovine,
  pretraziProizvode,
  pretraziDokumentaciju,
  predloziProizvode
};

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,      // prozor od 15 minuta
  limit: 5,                      // najviše 5 neuspelih pokušaja
  skipSuccessfulRequests: true,  // uspešne prijave se ne računaju
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Previše neuspelih pokušaja prijave. Pokušaj ponovo za 15 minuta.' }
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,           // prozor od 1 minuta
  limit: 10,                     // najviše 10 pitanja u minuti po korisniku
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.korisnik.ime,
  message: { error: 'Previše zahteva. Sačekaj minut pa pokušaj ponovo.' }
});

//middleware za autentifikaciju korisnika

function proveriToken(req, res, next) {
    const token = req.headers['x-api-token'];
  
    if (!token) {
      return res.status(401).json({ error: 'Nedostaje token. Dodaj header x-api-token.' });
    }
  
    const korisnik = korisnici[token];
  
    if (!korisnik) {
      return res.status(401).json({ error: 'Nevažeći token.' });
    }
  
    req.korisnik = korisnik;
    next();
  }

//END middleware za autentifikaciju korisnika

app.get('/', (req, res) => {
  res.json({ status: 'Kingdom AI backend radi' });
});

//ruta vezano za login, vraća token koji se koristi za autentifikaciju

app.post('/login', loginLimiter, (req, res) => {
  const { korisnickoIme, lozinka } = req.body;

  const podaci = loginPodaci[korisnickoIme];

  if (!podaci || podaci.lozinka !== lozinka) {
    return res.status(401).json({ error: 'Pogrešno korisničko ime ili lozinka.' });
  }

  const korisnik = korisnici[podaci.token];

  res.json({
    token: podaci.token,
    ime: korisnik.ime,
    uloga: korisnik.uloga
  });
});
//END login ruta

// Šalje jedan red (jedan JSON objekat) ka browseru
function posaljiRed(res, objekat) {
  res.write(JSON.stringify(objekat) + '\n');
}

app.post('/chat', proveriToken, chatLimiter, async (req, res) => {
  const { messages } = req.body;

  const dozvoljeno = dozvoljeniAlati[req.korisnik.uloga] || [];
  const filtriraniTools = tools.filter(t => dozvoljeno.includes(t.function.name));

  let konverzacija = [
    {
      role: 'system',
      content: 'Ti si Kingdom AI Assistant, pomažeš zaposlenima sa poslovnim upitima. Odgovaraj na gramatički ispravnom srpskom jeziku, isključivo latiničnim pismom, jasno i profesionalno. Cene u bazi nemaju definisanu valutu, zato ih navodi samo kao brojeve, bez oznake valute. Ne izmišljaj podatke koje nisi dobio iz alata.  Opise proizvoda prenosi tačno onako kako su dobijeni iz alata, ne dopisuj im nove osobine ili namene. Od rezultata pretrage preporuči samo one proizvode koji stvarno odgovaraju upitu, a ostale izostavi.'
    },
    ...messages
  ];

  // Od ovog trenutka šaljemo stream, pa se status (200) ne može više menjati
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders();

  // Ako browser prekine vezu (dugme "Prekini"), petlja staje
  let klijentOdustao = false;
  res.on('close', () => {
    if (!res.writableEnded) klijentOdustao = true;
  });

  const MAX_KORAKA = 8;
  let korak = 0;
  let zavrseno = false;

  try {
    while (!zavrseno && korak < MAX_KORAKA && !klijentOdustao) {
      korak++;
      const pocetak = Date.now();

      // Retry važi samo za OTVARANJE streama, dok korisnik još nije dobio ništa
      const stream = await pozoviSaPonavljanjem(
        () => openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: konverzacija,
          tools: filtriraniTools,
          stream: true,
          stream_options: { include_usage: true },
        }),
        'chat'
      );

      let tekst = '';
      const skupljeniPozivi = [];
      let usage = null;

      for await (const chunk of stream) {
        if (klijentOdustao) break;

        if (chunk.usage) usage = chunk.usage;

        const delta = chunk.choices[0] && chunk.choices[0].delta;
        if (!delta) continue; // poslednji deo sa usage podacima nema choices

        // Tekst šaljemo korisniku odmah
        if (delta.content) {
          tekst += delta.content;
          posaljiRed(res, { tip: 'tekst', sadrzaj: delta.content });
        }

        // Pozive alata samo skupljamo, po rednom broju (index)
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const i = tc.index;
            if (!skupljeniPozivi[i]) {
              skupljeniPozivi[i] = { id: '', type: 'function', function: { name: '', arguments: '' } };
            }
            if (tc.id) skupljeniPozivi[i].id = tc.id;
            if (tc.function && tc.function.name) skupljeniPozivi[i].function.name += tc.function.name;
            if (tc.function && tc.function.arguments) skupljeniPozivi[i].function.arguments += tc.function.arguments;
          }
        }
      }

      if (klijentOdustao) {
        console.log(`[korak ${korak}] Klijent je prekinuo vezu, zaustavljam petlju`);
        return;
      }

      const pozivi = skupljeniPozivi.filter(Boolean);

      zabeleziPoziv({
        tip: 'chat',
        model: 'gpt-4o-mini',
        korisnik: req.korisnik.ime,
        usage: usage,
        trajanjeMs: Date.now() - pocetak,
        alati: pozivi.map(p => p.function.name)
      });

      if (pozivi.length > 0) {
        konverzacija.push({ role: 'assistant', content: tekst || null, tool_calls: pozivi });

        for (const poziv of pozivi) {
          const imeFunkcije = poziv.function.name;
          let rezultat;

          let argumenti;
          try {
            argumenti = JSON.parse(poziv.function.arguments);
          } catch (e) {
            argumenti = null;
          }

          console.log(`[korak ${korak}] AI poziva funkciju: ${imeFunkcije}`, argumenti);

          const funkcija = dostupneFunkcije[imeFunkcije];

          if (argumenti === null) {
            rezultat = { error: 'Neispravni argumenti funkcije.' };
          } else if (!funkcija) {
            rezultat = { error: 'Nepoznata funkcija' };
          } else if (!dozvoljeno.includes(imeFunkcije)) {
            rezultat = { error: 'Nemate dozvolu za ovu funkciju.' };
            console.warn(`Odbijen pokušaj: ${req.korisnik.ime} (${req.korisnik.uloga}) je tražio ${imeFunkcije}`);
          } else {
            rezultat = await funkcija(...Object.values(argumenti));
          }

          konverzacija.push({
            role: 'tool',
            tool_call_id: poziv.id,
            content: JSON.stringify(rezultat)
          });
        }
      } else {
        zavrseno = true;
      }
    }

    if (!zavrseno) {
      console.warn(`Petlja prekinuta: dostignut limit od ${MAX_KORAKA} koraka`);
      posaljiRed(res, {
        tip: 'tekst',
        sadrzaj: 'Nisam uspeo da završim zadatak u dozvoljenom broju koraka. Pokušaj da pitanje podeliš na manje delove.'
      });
    }

    posaljiRed(res, { tip: 'kraj' });
    res.end();
  } catch (error) {
    console.error(error);
    if (!res.writableEnded && !res.destroyed) {
      posaljiRed(res, { tip: 'greska', poruka: 'Greška prilikom komunikacije sa AI modelom' });
      res.end();
    }
  }
});
// END /chat ruta

// Test ruta: Structured Output / JSON, tačno formatiranje odgovora radi upisa u bazu
app.post('/extract', proveriToken, async (req, res) => {
  const { text } = req.body;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Izvuci podatke iz teksta korisnika i vrati ISKLJUČIVO JSON u ovom formatu, bez ikakvog dodatnog teksta:
{
  "kupac": "ime kupca ili null",
  "proizvod": "naziv proizvoda ili null",
  "kolicina": broj ili null
}`
        },
        { role: 'user', content: text }
      ],
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0].message.content;
    const parsed = JSON.parse(raw);

    // Validacija: proveravamo da li struktura ima smisla PRE nego što je koristimo
    if (parsed.kolicina !== null && typeof parsed.kolicina !== 'number') {
      return res.status(400).json({ error: 'Neispravan format: kolicina mora biti broj' });
    }

    if (parsed.kolicina !== null && parsed.kolicina <= 0) {
      return res.status(400).json({ error: 'Neispravna vrednost: kolicina mora biti pozitivan broj' });
    }

    res.json(parsed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Greška prilikom obrade' });
  }
});
// END /extract ruta

app.get('/potrosnja', proveriToken, (req, res) => {
  res.json(dajUkupno());
});

app.listen(PORT, () => {
  console.log(`Server pokrenut na portu ${PORT}`);
});