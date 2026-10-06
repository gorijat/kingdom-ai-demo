// Mali MCP klijent: pokreće mcp-server.js kao poseban proces i priča sa njim
// preko stdin/stdout. Pokazuje celu sekvencu: handshake, lista alata, poziv alata.
const { spawn } = require('child_process');
const readline = require('readline');

const server = spawn('node', ['mcp-server.js'], { stdio: ['pipe', 'pipe', 'inherit'] });

let sledeciId = 1;
const cekaju = new Map();

readline.createInterface({ input: server.stdout }).on('line', (red) => {
  const poruka = JSON.parse(red);
  const resolve = cekaju.get(poruka.id);
  if (resolve) {
    cekaju.delete(poruka.id);
    resolve(poruka);
  }
});

function posalji(method, params) {
  const id = sledeciId++;
  const zahtev = { jsonrpc: '2.0', id, method, params };
  console.log('->', JSON.stringify(zahtev));
  server.stdin.write(JSON.stringify(zahtev) + '\n');
  return new Promise(resolve => cekaju.set(id, resolve));
}

function obavesti(method, params) {
  server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
}

async function pozovi(name, args) {
  const odg = await posalji('tools/call', { name, arguments: args });
  console.log('<-', JSON.stringify(odg).slice(0, 400), '\n');
  return odg;
}

(async () => {
  // 1. Handshake
  const init = await posalji('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-klijent', version: '1.0.0' }
  });
  console.log('<-', JSON.stringify(init), '\n');
  obavesti('notifications/initialized');

  // 2. Koje alate server nudi?
  const lista = await posalji('tools/list', {});
  console.log('Alati:', lista.result.tools.map(t => t.name).join(', '), '\n');

  // 3. Pozivi alata (argumenti po imenu)
  await pozovi('pronadjiKupca', { ime: 'Marko' });
  await pozovi('istorijaKupovine', { kupacId: 1, brojMeseci: 6 });
  await pozovi('nepostojeciAlat', {});

  server.stdin.end();
})();