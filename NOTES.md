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


## Sedmica 3 — 2.2 Embeddings + 2.3 RAG KOMPLETNO

### Šta je urađeno
- cosinesSimilarity, generisiEmbedding - deljene pomoćne funkcije u functions.js
- pretraziProizvode - semantic search nad proizvodima (2.2)
- pretraziDokumentaciju - semantic search nad FAQ dokumentacijom (2.3, dokumentacija.js)
- Obe funkcije dodate kao tool-ovi u /chat rutu (sada 4 dostupne funkcije ukupno)
- await dodat u tool calling petlju (radi za sinhrone i asinhrone funkcije)

### Ključni koncept
- RAG = tool calling nad TEKSTOM umesto nad strukturiranim podacima
- Isti embedding/similarity princip radi i za proizvode i za dokumentaciju
- Model KORISTI pronađeni tekst kao kontekst, ne prepisuje ga doslovno -
  ume da "izračuna" (npr. da li 5 dana < 14 dana rok) na osnovu njega

### Trenutno stanje /chat rute (4 tool-a)
1. pronadjiKupca - SQL pretraga kupaca
2. istorijaKupovine - SQL JOIN, kupovine jednog kupca
3. pretraziProizvode - semantic search nad proizvodima
4. pretraziDokumentaciju - semantic search nad FAQ

### Sledeće: 2.4 AI Agents (agent loop, planning)


## Sedmica 3-4 — 2.4 AI Agents (u toku)

### Šta je urađeno
- seed.js proširen: 20 proizvoda, 4 kupca (reset AUTOINCREMENT brojača preko sqlite_sequence)
- Keš embeddinga (Map) u functions.js, da se isti tekst ne šalje OpenAI-ju dvaput
- predloziProizvode(kupacId): profil kupca = embedding svega što je kupio, kandidati = samo
  ono što NIJE kupio (SQL poddupit NOT IN), rangiranje po cosine similarity
- istorijaKupovine dobila opcioni brojMeseci (filter po datumu, validacija tipa)
- Ukupno 5 alata u /chat ruti

### Ključni koncept
- /chat while petlja JE agent loop: model sam bira redosled alata
  (pronadjiKupca -> istorijaKupovine -> predloziProizvode) bez naših instrukcija
- Pravilo "ne predlaži već kupljeno" je u SQL-u (zagarantovano), ne u promptu (verovatno)

### Bagovi koje smo rešili
- Dupli identifikatori u index.js (istorijaKupovine 2x u require, tools i mapi) -> server ne startuje
- Model je izmislio valutu (EUR) -> pravilo u system poruci + "ne izmišljaj podatke"

### Otvorene stavke (vratiti se pred kraj)
- Kvalitet preporuka: opisi proizvoda su prekratki (naziv + kategorija), pa "liče na" često znači
  "zamena" (npr. još jedan monitor), ne "dopuna". Popravka: kolona opis u tabeli proizvodi
- Argumenti se prosleđuju po redosledu (Object.values), ne po imenu -> očvrsnuti tako da
  funkcije primaju objekat
- /chat više nije streaming; UI streaming odložen
- Rate limits, retry, praćenje tokena (Sedmica 4)


### 2.4 završeno
- Limit koraka u agent petlji (MAX_KORAKA = 8): štiti od beskonačne petlje i troška
  API poziva. Testirano tako što smo privremeno spustili na 1 (agent nije stigao do
  odgovora, vratio našu poruku), pa vratili na 8
- Teorija: ReAct (reaktivno) vs plan-and-execute; kratkoročna memorija = niz konverzacija,
  dugoročna = baza kroz alate; tool pozivi ne žive između zahteva, samo user/assistant poruke


## 2.5 Autentikacija i permisije — KOMPLETNO

### Šta je urađeno
- korisnici.js: mapa token -> {ime, uloga}, i mapa uloga -> dozvoljeni alati
- proveriToken middleware: čita x-api-token header, 401 ako nema ili je nevažeći,
  kači req.korisnik ako je token ispravan
- /chat ruta: middleware primenjen (app.post('/chat', proveriToken, async...))
- tools lista se filtrira po ulozi PRE slanja modelu (model fizički ne vidi
  alate koje ne sme da koristi)
- Dupla provera: čak i da model nekako zatraži nedozvoljen alat, provera
  neposredno pre izvršavanja to ponovo hvata i loguje pokušaj

### Ključni koncept
- Autentikacija (ko si) i autorizacija (šta smeš) su odvojene provere
- Permisije se proveravaju u KODU, nikad samo u promptu - prompt se može
  zaobići (prompt injection), kod ne
- Filtriranje tools liste je jače od "reci mu da ne sme" - model ne može
  tražiti nešto što nikad nije video

### Testirano
- Bez tokena -> 401, model se ne poziva
- Uloga podrska pita o kupcu -> nema pronadjiKupca u listi, model se snađe
  sa pretraziDokumentaciju, iskreno kaže da nema informaciju
- Uloga prodaja isto pitanje -> pun pristup, normalan odgovor

### Napomena (van originalnog plana, ali bitno za pravu upotrebu)
Token je za sada upisan u kod (korisnici.js) - u pravom sistemu bi ovo bila
prava baza korisnika sa hešovanim lozinkama, verovatno JWT ili sličan sistem.
Princip (middleware, filtriranje po ulozi) ostaje isti.


## Login sistem (van originalnog plana, nadogradnja 2.5)

### Šta je urađeno
- /login ruta: prima korisničko ime i lozinku, vraća token, ime i ulogu (loginPodaci u korisnici.js)
- Ista poruka greške za pogrešno ime i pogrešnu lozinku (ne otkriva da li korisnik postoji)
- React: uslovno renderovanje (login forma ili chat), token se šalje u x-api-token headeru
- Sesija u sessionStorage (preživi refresh, briše se zatvaranjem taba)
- Odjava čisti token, poruke, polja forme i greške (sledeći korisnik ne vidi tuđe podatke)

### Bagovi koje smo rešili
- Beli ekran posle prijave: stopGeneration je bila obrisana, pa onda pogrešno
  napisana (stopGenaration). Dugme "Prekini" se iscrtava samo dok loading=true, pa je
  React pao tek kad je poslato pitanje. Pravi uzrok se našao tek u browser konzoli (F12)
- Lekcija: kad ekran nestane, prvo konzola, tek onda nagađanje

### Otvorene stavke (bezbednost, pre prave upotrebe)
- Lozinke su čist tekst u kodu: u pravom sistemu bcrypt heš i prava baza korisnika
- Tokeni su fiksni stringovi: u pravom sistemu JWT sa rokom trajanja
- sessionStorage čitljiv svakom skriptu na stranici: u pravom sistemu httpOnly kolačić
- /login nema ograničenje broja pokušaja (brute force)
- /extract ruta NEMA proveru tokena, a zove OpenAI (svako može da troši pozive).
  Zaštititi sa proveriToken ili obrisati, jer je bila samo test ruta


### Praćenje tokena i logovanje (1.2) — završeno
- pracenje.js: zabeleziPoziv() upisuje JSON red u ai-pozivi.log i sabira ukupno u memoriji
- Loguju se samo brojevi i imena alata, ne tekst poruka (u porukama su podaci o kupcima)
- /potrosnja ruta (iza tokena) vraća ukupne pozive, tokene i trošak
- Zapažanje: ulazni tokeni rastu iz koraka u korak jer svaki poziv nosi celu istoriju
  i definicije alata (prvi poziv ~540 tokena za jednu rečenicu)
- Zapažanje: trosakUSD po redu embeddinga je 0 zbog zaokruživanja, ukupan zbir je tačan
- Cene u CENE mapi su upisane ručno: proveriti na openai.com/api/pricing
- Brojač ukupno živi u memoriji (nestaje pri restartu), log fajl je trajan


### Retry i rate limits (1.2) — završeno
- ponavljanje.js: pozoviSaPonavljanjem(poziv) — ponavlja samo 408/409/429/5xx i prekide veze,
  ne 400/401; exponential backoff (1s, 2s, 4s) + jitter do 30%, poštuje Retry-After header,
  max 4 pokušaja pa baca grešku
- maxRetries: 0 na OpenAI klijentima (functions.js i index.js), da se ugrađeni retry i naš ne množe
- express-rate-limit: /login 5 neuspelih pokušaja u 15 min po IP (uspešne se ne računaju),
  /chat 10 zahteva u minuti po korisniku (chatLimiter ide POSLE proveriToken jer koristi req.korisnik)
- Brojači žive u memoriji (brišu se restartom); sa više servera treba zajednička baza
- Testirano: lažne greške (429, 401, 503) i limit na /login. Kroz pravi OpenAI poziv retry
  nije izazvan (nije bilo grešaka)
- Razlika smerova: retry = mi zovemo OpenAI i on odbije; rate limit = klijenti zovu nas

## Streaming (NDJSON)

- Backend šalje odgovor red po red, svaki red je jedan JSON događaj:
  `{"tip":"tekst","sadrzaj":"..."}`, `{"tip":"greska","poruka":"..."}`, `{"tip":"kraj"}`.
- Zaglavlje je `application/x-ndjson`, a `res.flushHeaders()` šalje status odmah.
  Posle toga se status više ne može promeniti, zato se greške usred toka šalju kao `{"tip":"greska"}`.
  401 i 429 stižu pre toka kao obične JSON greške.
- `stream: true` + `stream_options: { include_usage: true }`: poslednji deo sadrži `usage`,
  pa se tokeni i dalje beleže u `pracenje.js`.
- Pozivi alata stižu u fragmentima (`delta.tool_calls`) i skupljaju se po `index`,
  a funkcija se izvršava tek kad je poziv kompletan.
- Retry (`pozoviSaPonavljanjem`) važi samo do prvog primljenog dela. Posle toga ponavljanje
  bi duplo ispisalo tekst.
- Prekid: `res.on('close')` postavlja `klijentOdustao`, petlja staje i server ne troši
  nove tokene. U logu: "Klijent je prekinuo vezu, zaustavljam petlju".
- Frontend: `response.body.getReader()`, `TextDecoder` sa `{ stream: true }` (da ž, č, ć, š, đ
  ne pucaju na granici dela), bafer `ostatak` za nedovršen red, `AbortController` za "Prekini".
- Odjava usred odgovora prekida tok.

## Veliki katalog i sačuvani embeddinzi

- Katalog: 239 proizvoda u `server/katalog.js` (naziv, kategorija, cena, opis). Prvih 20 su na istim indeksima kao ranije, jer seed vezuje porudžbine po indeksu.
- `generisi-embeddinge.js` jednom računa vektore (grupe po 100, tekst = naziv + kategorija + opis) i čuva ih kao JSON u koloni `embedding`. Posle svakog `node seed.js` mora ponovo da se pokrene.
- `pretraziProizvode` radi jedan poziv ka OpenAI-ju (embedding upita), a vektore proizvoda čita iz baze.
- `predloziProizvode` ne zove OpenAI uopšte: profil kupca je prosek vektora kupljenih proizvoda.
- Modelu se nikad ne vraćaju sirovi vektori, samo naziv, kategorija, cena, opis i skor.
- Poznata ograničenja: profil kao jedan prosečan vektor daje "slične" proizvode (npr. još SSD-ova kupcu koji ima SSD), a ne dopune. Retki lažni pogoci (npr. "zaštita" → zaštitno staklo). Za desetine hiljada zapisa potrebna je prava vektorska baza.