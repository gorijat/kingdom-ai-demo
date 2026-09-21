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

app.listen(PORT, () => {
  console.log(`Server pokrenut na portu ${PORT}`);
});