# Kingdom AI Assistant (demo)

Interni demo za učenje AI integracija u web aplikacije: korisnik prirodnim jezikom zadaje poslovni zahtev, AI model određuje potrebne korake, NodeJS poziva kontrolisane funkcije i izvore podataka, a React prikazuje rezultat.

Primer: *"Pronađi kupca Marko, pogledaj šta je kupovao u poslednjih 6 meseci i predloži mu 5 proizvoda koje bi mogao dodatno da kupi."*

## Tehnologije

- **Frontend:** React (Vite), react-markdown
- **Backend:** Node.js, Express
- **AI:** OpenAI `gpt-4o-mini` (chat, tool calling, streaming), `text-embedding-3-small` (embeddings)
- **Baza:** SQLite (`better-sqlite3`)

## Šta demo pokazuje

- Chat sa odgovorima koji stižu uživo (streaming, NDJSON) i dugmetom za prekid
- Tool calling u petlji (agent): model sam bira alate i povezuje rezultate
  - `pronadjiKupca`, `istorijaKupovine` (sa filterom po broju meseci)
  - `pretraziProizvode` (semantic search nad 239 proizvoda)
  - `pretraziDokumentaciju` (RAG nad internim FAQ-om)
  - `predloziProizvode` (preporuke na osnovu istorije kupovine)
- Embeddings: vektori proizvoda se računaju jednom i čuvaju u bazi
- Prijava i uloge: `prodaja` sme sve alate, `podrska` samo pretragu proizvoda i dokumentacije
- Rate limit, retry sa exponential backoff-om, praćenje potrošnje tokena
- Structured output: `/extract` ruta sa validacijom JSON-a
- Jednostavan MCP server (`server/mcp-server.js`) i klijent za test

## Struktura

```
client/                 React aplikacija (Vite)
server/
  index.js              Express: /login, /chat (stream), /extract, /potrosnja
  functions.js          Funkcije koje AI sme da zove
  korisnici.js          Korisnici, uloge, dozvoljeni alati
  db.js, seed.js        SQLite baza i punjenje test podacima
  katalog.js            239 proizvoda sa opisima
  dokumentacija.js      FAQ za RAG
  generisi-embeddinge.js  Jednokratno računanje vektora proizvoda
  pracenje.js           Praćenje tokena i troška (ai-pozivi.log)
  ponavljanje.js        Retry sa backoff-om
  mcp-server.js         Testni MCP server (stdio)
  mcp-klijent.js        Mali MCP klijent za proveru servera
  test-pretraga.js      Provera semantic search-a
CHECKLIST.md, NOTES.md, PUSKICA.md   Beleške iz učenja
```

## Pokretanje

Potrebno: Node.js 20+, OpenAI API ključ.

```bash
# 1. Backend
cd server
npm install
echo "OPENAI_API_KEY=tvoj_kljuc" > .env
node seed.js                  # pravi bazu (kupci, proizvodi, porudžbine)
node generisi-embeddinge.js   # računa i čuva vektore (jednom, i posle svakog seed-a)
npm run dev                   # port 5000

# 2. Frontend (drugi terminal)
cd client
npm install
npm run dev                   # obično http://localhost:5173
```

Test korisnici (samo za demo):

| Korisnik | Lozinka | Uloga |
|---|---|---|
| marko | prodaja123 | prodaja |
| ana | podrska123 | podrska |

Provera potrošnje (potreban je token iz `server/korisnici.js`):

```bash
curl -s http://localhost:5000/potrosnja -H "x-api-token: tajna-prodaja-1"
```

Test MCP servera:

```bash
cd server
node mcp-klijent.js
```

## Kako teče zahtev

React → `POST /chat` (token u headeru) → Express proverava token i ulogu, filtrira alate →
model predlaže poziv alata → backend validira i izvršava funkciju (SQL ili pretraga vektora) →
rezultat se vraća modelu → model formuliše odgovor → tekst se šalje nazad kao tok (NDJSON).

AI nema direktan pristup bazi: sve ide kroz funkcije u `functions.js`, a dozvole se proveravaju i
pri slanju liste alata i pri izvršavanju.

## Poznata ograničenja

- Lozinke su u običnom tekstu, tokeni fiksni, sesija u `sessionStorage` (nema JWT-a ni bcrypt-a). Samo za demo.
- Brojači rate limita i potrošnje su u memoriji i nuliraju se pri restartu servera (istorija ostaje u `ai-pozivi.log`).
- Preporuke daju "slične" proizvode (npr. još SSD-ova kupcu koji ima SSD), a ne dopune.
- Pretraga loše radi sa vrlo kratkim upitima; opis alata zato traži pun opis proizvoda.
- Model povremeno greši u gramatici srpskog i ponekad dopiše detalje; zato odgovore treba proveravati.
- SQLite i pretraga vektora u JavaScript-u dovoljni su za stotine zapisa; za veće količine treba prava vektorska baza.
- Za povezivanje sa stvarnim sistemima: zameniti SQLite PostgreSQL-om/MySQL-om i dodati pravu autentifikaciju.