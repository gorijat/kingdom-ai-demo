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

const openai = new OpenAI({ // Klijent za OpenAI API
  apiKey: process.env.OPENAI_API_KEY,
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
            description: 'Opis onoga što korisnik traži, prirodnim jezikom'
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

app.get('/', (req, res) => {
  res.json({ status: 'Kingdom AI backend radi' });
});

// /chat ruta: tool calling petlja (agent loop)
app.post('/chat', async (req, res) => {
  const { messages } = req.body;

  let konverzacija = [
    {
      role: 'system',
      content: 'Ti si Kingdom AI Assistant, pomažeš zaposlenima sa poslovnim upitima. Odgovaraj na gramatički ispravnom srpskom jeziku, isključivo latiničnim pismom, jasno i profesionalno. Cene u bazi nemaju definisanu valutu, zato ih navodi samo kao brojeve, bez oznake valute. Ne izmišljaj podatke koje nisi dobio iz alata.'
    },
    ...messages
  ];

  try {
    let nastaviPetlju = true;

    while (nastaviPetlju) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: konverzacija,
        tools: tools,
      });

      const poruka = response.choices[0].message;

      if (poruka.tool_calls) {
        konverzacija.push(poruka);

        for (const poziv of poruka.tool_calls) {
          const imeFunkcije = poziv.function.name;
          const argumenti = JSON.parse(poziv.function.arguments);

          console.log(`AI poziva funkciju: ${imeFunkcije}`, argumenti);

          const funkcija = dostupneFunkcije[imeFunkcije];
          let rezultat;

          if (!funkcija) {
            rezultat = { error: 'Nepoznata funkcija' };
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
        res.json({ reply: poruka.content });
        nastaviPetlju = false;
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Greška prilikom komunikacije sa AI modelom' });
  }
});
// END /chat ruta

// Test ruta: Structured Output / JSON, tačno formatiranje odgovora radi upisa u bazu
app.post('/extract', async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Server pokrenut na portu ${PORT}`);
});