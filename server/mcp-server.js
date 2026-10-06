// Jednostavan MCP server (transport: stdio). Izlaže naše funkcije kao MCP alate.
// MCP je u osnovi JSON-RPC 2.0: svaka poruka je jedan JSON u jednom redu.
// Server čita zahteve sa stdin, a odgovore piše na stdout.

// VAŽNO: stdout je rezervisan za protokol. Sve što bi se slučajno ispisalo sa
// console.log (i u našim fajlovima ili bibliotekama) preusmeravamo na stderr,
// inače bi pokvarilo poruke koje klijent čita.
console.log = (...args) => console.error(...args);

require('dotenv').config({ quiet: true }); // quiet: dotenv ne sme ništa da ispisuje na stdout
const readline = require('readline');
const { pronadjiKupca, istorijaKupovine, pretraziProizvode } = require('./functions');

// Definicije alata. Primeti: inputSchema je isti JSON Schema koji već
// koristimo kao "parameters" u OpenAI tools nizu u index.js.
const alati = [
  {
    name: 'pronadjiKupca',
    description: 'Pronalazi kupca po imenu ili delu imena i vraća njegove osnovne podatke (id, ime, email).',
    inputSchema: {
      type: 'object',
      properties: { ime: { type: 'string', description: 'Ime ili deo imena kupca koji se traži' } },
      required: ['ime']
    }
  },
  {
    name: 'istorijaKupovine',
    description: 'Vraća listu proizvoda koje je kupac naručio, od najnovije ka najstarijoj kupovini. Opcionalno ograničava na poslednjih N meseci.',
    inputSchema: {
      type: 'object',
      properties: {
        kupacId: { type: 'number', description: 'ID kupca čija se istorija kupovine traži' },
        brojMeseci: { type: 'number', description: 'Opciono: samo kupovine iz poslednjih N meseci' }
      },
      required: ['kupacId']
    }
  },
  {
    name: 'pretraziProizvode',
    description: 'Pretražuje katalog proizvoda po značenju upita (semantic search). Upit treba da bude pun opis: vrsta proizvoda i namena.',
    inputSchema: {
      type: 'object',
      properties: { upit: { type: 'string', description: 'Pun opis proizvoda koji se traži, npr. "IP kamera za video nadzor dvorišta"' } },
      required: ['upit']
    }
  }
];

const implementacije = { pronadjiKupca, istorijaKupovine, pretraziProizvode };

function odgovori(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}

function greska(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}

async function obradi(poruka) {
  const { id, method, params } = poruka;

  // Poruke bez id-ja su obaveštenja: server na njih ne odgovara
  if (id === undefined) return;

  if (method === 'initialize') {
    return odgovori(id, {
      protocolVersion: params?.protocolVersion || '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'kingdom-mcp', version: '1.0.0' }
    });
  }

  if (method === 'ping') return odgovori(id, {});

  if (method === 'tools/list') return odgovori(id, { tools: alati });

  if (method === 'tools/call') {
    const funkcija = implementacije[params?.name];
    if (!funkcija) return greska(id, -32602, `Nepoznat alat: ${params?.name}`);

    try {
      const rezultat = await funkcija(params.arguments || {});
      return odgovori(id, { content: [{ type: 'text', text: JSON.stringify(rezultat) }] });
    } catch (err) {
      // Greška alata se vraća kao običan rezultat sa isError, da je model može pročitati
      return odgovori(id, { isError: true, content: [{ type: 'text', text: `Greška: ${err.message}` }] });
    }
  }

  return greska(id, -32601, `Metoda nije podržana: ${method}`);
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (red) => {
  if (!red.trim()) return;
  let poruka;
  try {
    poruka = JSON.parse(red);
  } catch {
    return greska(null, -32700, 'Neispravan JSON');
  }
  obradi(poruka).catch(err => console.error('Neočekivana greška:', err));
});

console.error('[mcp] kingdom-mcp server spreman (stdio)');