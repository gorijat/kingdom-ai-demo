require('dotenv').config();
const express = require('express');
const cors = require('cors');

const OpenAI = require('openai'); 

const openai = new OpenAI({ // Klient za OpenAI API
  apiKey: process.env.OPENAI_API_KEY,
});



const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Kingdom AI backend radi' });
});


//ABout streaming, prva ruta koja koristi streaming i generalno prva ruta /chat

app.post('/chat', async (req, res) => {
    const { messages } = req.body;
  
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
  
    try {
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Ti si Kingdom AI Assistant, pomažeš zaposlenima sa poslovnim upitima.' },
            ...messages
        ],
        stream: true,
      });
  
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        res.write(content);
      }
  
      res.end();
    } catch (error) {
      console.error(error);
      res.status(500).end('Greška prilikom komunikacije sa AI modelom');
    }
  });

//END /chat ruta

//Test ruta Structured Output / JSON tacno formatiranje odgovora radi upisa u bazu npr

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

// Validacija - proveravamo da li struktura ima smisla PRE nego što je koristimo
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

//END Test ruta Structured Output / JSON

app.listen(PORT, () => {
  console.log(`Server pokrenut na portu ${PORT}`);
});