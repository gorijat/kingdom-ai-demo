# Kingdom AI — Notes / Recap

## Sedmica 1 — deo 1: Backend osnove (1.1, 1.2)

### Šta je urađeno
- Git init, struktura foldera (server/, client/)
- Express server sa osnovnom test rutom
- OpenAI klijent povezan preko API ključa iz .env
- /chat ruta sa STREAMING odgovorom (stream: true)

### Ključni koncepti
- LLM ne "razume", predviđa sledeći token na osnovu konteksta
- system/user/assistant poruke — system definiše ponašanje modela
- Streaming = odgovor stiže u komadima (chunks), ne odjednom
- for await (const chunk of stream) — čita chunk po chunk kako stižu
- try/catch obavezan oko svakog AI poziva (mreža/API mogu da otkažu)

### Redosled u Node fajlu (VAŽNO pravilo)
1. require pozivi
2. inicijalizacija (app, openai klijent)
3. middleware (app.use)
4. rute (app.get, app.post)
5. app.listen na kraju

### Odloženo za kasnije (Sedmica 4 — polish)
- Rate limiting i retry logika
- Praćenje tokena i troškova poziva

### Korisne komande
- npm run dev — pokreće server sa nodemon (auto-restart)
- curl -X POST http://localhost:5000/chat -H "Content-Type: application/json" -d '{"message": "..."}'
- pwd — proveri gde si u terminalu
- git add . / git commit -m "..." — RADI IZ KORENA projekta (kingdom-ai-final)


## Sedmica 1 — deo 2: React setup

### Šta je urađeno
- React podignut preko Vite (ne create-react-app — CRA je napušten, Vite je brži)
- npm create vite@5 client -- --template react (fiksirana v5 zbog kompatibilnosti)
- Dev server radi na http://localhost:5173

### Ključni koncept
- Vite koristi native ES modules u razvoju → skoro trenutan start i hot reload
- Backend (port 5000) i frontend (port 5173) rade odvojeno, komuniciraju preko HTTP poziva


## Status: gde smo stali
- Završeno: Sedmica 1 kompletno (backend + React chat UI, osnovna veza radi)
- Sledeće: 2.1 Function/Tool calling — AI bira i poziva backend funkcije
- Streaming u UI (ReadableStream) odloženo kao "polish" za kasnije


## Status: gde smo stali (ISPRAVKA)
Primetili smo da smo preskočili delove 1.3/1.4. Pre tool callinga (2.1), redosled za sutra:
1. Istorija razgovora i state management (KLJUČNO - preduslov za tool calling)
2. Structured Output / JSON (1.4)
3. Loading/error states + prekid generisanja (AbortController)
4. Markdown prikaz odgovora
5. UI streaming (ReadableStream)
6. Odloženo za Sedmicu 4: rate limits, retry, token tracking, detaljniji error handling


## Sedmica 1 — KOMPLETNO (backend + frontend + JSON + UX)

### Šta je urađeno
- Express server, OpenAI klijent, /chat ruta sa streaming (backend)
- React + Vite chat UI, povezan na backend
- Istorija razgovora — messages niz (frontend pamti, backend prima ceo kontekst)
- Structured Output — /extract ruta, response_format: json_object
- Validacija JSON odgovora PRE upotrebe (tip + poslovna logika)
- Error states + AbortController (prekid generisanja)
- Markdown prikaz (react-markdown)

### Ključni princip koji se provlači kroz sve
NIKAD ne veruj slepo AI odgovoru koji ide dalje u sistem (akcija/baza).
Uvek validiraj na BACKENDU, nikad se ne oslanjaj samo na frontend proveru.
Korisnik može poslati bilo šta (čak i mimo UI-ja, direktno na API) —
mi kontrolišemo šta IZLAZI i šta se IZVRŠAVA, ne šta ULAZI.

### Tok podataka (bitno za pamćenje)
Browser → fetch → Node backend → OpenAI API → nazad Node backendu
→ (validacija/obrada) → nazad browseru (res.json/res.write)
Model NIKAD ne priča direktno sa korisnikom - uvek ide kroz naš backend.

### Odloženo za kasnije
- UI streaming (ReadableStream) - vraćamo se posle tool callinga
- Rate limits, retry, token tracking - Sedmica 4 (polish)

### Sledeće: 2.1 Tool / Function Calling


### Dodatni UX fix (van originalnog plana, ali koristan)
- Auto-scroll na dno chat-a: useRef + useEffect sa [messages] dependency,
  scrollIntoView({ behavior: 'smooth' }) na praznom div na kraju liste poruka


### Rešeni problem: better-sqlite3 na starijem sistemu
- Node-gyp kompajliranje je zahtevalo Xcode Command Line Tools (xcode-select --install)
- Najnovija verzija better-sqlite3 (13.x) je pravila Segmentation fault na Node 20.9 / macOS Big Sur
- Rešenje: better-sqlite3@9.6.0 (starija, stabilnija verzija za ovu kombinaciju Node/macOS)
- Lekcija: EBADENGINE upozorenja NISU uvek bezopasna - mogu ukazivati na pravu binarnu inkompatibilnost


## Sedmica 2 — Tool/Function Calling (2.1) KOMPLETNO

### Šta je urađeno
- tools lista sa definicijama pronadjiKupca i istorijaKupovine (name, description, parameters)
- dostupneFunkcije mapa (ime stringa -> prava JS funkcija)
- /chat ruta prepravljena: while petlja koja hvata tool_calls, izvršava
  prave funkcije, vraća rezultat modelu (role: 'tool'), dok model ne
  vrati finalan tekst

### Ključni koncept
- Model NE izvršava kod - samo predlaže poziv (tool_calls), backend
  validira i izvršava
- Model može tražiti VIŠE poziva u nizu (prvo pronadjiKupca da dobije ID,
  pa istorijaKupovine sa tim ID-jem) - to je razlog za while petlju
- /chat ruta trenutno NIJE streaming (privremeno - res.json na kraju,
  ne res.write) jer stream + tool calling zajedno je složenije

### Bug koji smo rešili
- curl u VS Code integrisanom terminalu je "ćutao" (visio), isti curl
  u običnom Terminal.app je radio odmah - koristiti spoljašnji terminal
  za curl testiranje, VS Code terminal samo za npm run dev


### Bug: frontend nije parsirao JSON nakon prelaska na tool calling
- Stara /chat ruta je slala čist tekst (res.write), frontend je radio response.text()
- Nova /chat ruta šalje JSON (res.json({reply: ...})), frontend MORA response.json()
  i data.reply, inače se prikazuje sirov JSON string na ekranu