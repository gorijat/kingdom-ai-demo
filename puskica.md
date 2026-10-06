# Kingdom AI — Puškica (pitanje/odgovor)

Sve pređeno gradivo, u formatu "ako me pitaju, šta odgovaram". Poslednja dopuna: posle završetka 2.2–2.6, login-a, praćenja tokena, retry-a, streaminga i velikog kataloga.

---

## 1.1 Osnove AI i LLM modela

**Šta je LLM i kako radi?**
Large Language Model — model koji predviđa sledeći token (deo reči) na osnovu konteksta. Ne "razume" u ljudskom smislu, radi statistički — na osnovu ogromne količine teksta na kojoj je treniran, procenjuje šta je najverovatniji sledeći deo teksta.

**Šta je token?**
Osnovna jedinica teksta koju model obrađuje — otprilike deo reči (ne cela reč, ne slovo). Cena i ograničenja API poziva se mere u tokenima (ulaznim + izlaznim).

**Šta je context window?**
Koliko teksta model može da "vidi" odjednom — uključuje system prompt, celu istoriju razgovora, i tools definicije. Sve se računa u isti "prostor".

**Šta je temperature?**
Parametar koji kontroliše koliko je odgovor "kreativan"/nepredvidiv. Niža temperatura = precizniji, dosledniji odgovori (dobro za poslovne sisteme). Viša = kreativniji, raznovrsniji odgovori.

**Šta su system/user/assistant poruke?**
- `system` — definiše ponašanje i ulogu modela (npr. "Ti si Kingdom AI Assistant")
- `user` — poruka koju šalje korisnik
- `assistant` — odgovor modela

**Šta je hallucination?**
Kad model "izmisli" informaciju koja zvuči uverljivo ali nije tačna — jer predviđa najverovatniji tekst, ne "zna" činjenice sa sigurnošću. Zato AI ne sme direktno da "izmišlja" poslovne podatke — mora da poziva prave funkcije (tool calling) koje čitaju stvarnu bazu.

**Kako se štitimo od hallucination-a?**
- Tool calling — AI poziva prave funkcije umesto da izmišlja podatke
- Validacija svakog odgovora pre upotrebe
- Jasna system poruka sa granicama ponašanja

**Cloud vs open-source modeli?**
- Cloud (OpenAI, Anthropic, Google) — ne brineš o infrastrukturi, plaćaš po tokenu, podaci putuju ka serverima provajdera
- Open-source (Llama, Mistral) — može lokalno, podaci ne napuštaju firmu, ali zahteva sopstvenu infrastrukturu (GPU)

---

## 1.2 AI API integracija kroz NodeJS

**Kako backend priča sa AI modelom?**
Preko `openai` npm paketa — pravi se klijent (`new OpenAI({ apiKey: ... })`), zatim poziva `openai.chat.completions.create({ model, messages })`.

**Kako se čuva API ključ?**
U `.env` fajlu (nikad hardkodovano u kod), učitava se preko `dotenv` paketa (`require('dotenv').config()` na vrhu fajla). `.env` je uvek u `.gitignore` — API ključevi nikad ne idu na Git.

**Šta je streaming i zašto ga koristimo?**
Odgovor stiže u malim delovima (chunks), ne odjednom — poboljšava korisničko iskustvo. U kodu: `stream: true` parametar, pa `for await (const chunk of stream)` petlja koja čita svaki deo.
NAPOMENA: kad smo dodali tool calling, /chat je neko vreme bio običan `res.json()`. Streaming smo vratili kasnije, zajedno sa tool callingom (vidi odeljak "Streaming (NDJSON)" niže).

**Zašto je try/catch obavezan oko AI poziva?**
Mreža, API ključ, ili sam servis mogu da otkažu — bez try/catch bi server pukao umesto da vrati čistu grešku korisniku.

**Koji je ispravan redosled koda u Node/Express fajlu?**
1. require pozivi
2. inicijalizacija (app, klijenti, tools definicije, mape funkcija)
3. middleware (app.use)
4. rute (app.get, app.post)
5. app.listen na kraju

---

## 1.3 ReactJS + AI

**Kako radi osnovni chat interfejs?**
`useState` čuva poruku koju kucaš (input), niz svih poruka (`messages`), i loading status. Dugme šalje `fetch` POST ka backend `/chat` ruti.

**Kako radi istorija razgovora / upravljanje stanjem?**
Umesto da šaljemo samo poslednju poruku, šaljemo CEO NIZ dosadašnjih poruka (`messages`, svaka sa `role: 'user'` ili `role: 'assistant'`) pri svakom novom upitu. Bez ovoga, model ne bi "pamtio" prethodni kontekst razgovora.

**Zašto se `role: 'user'` pravi na frontendu, ne na backendu?**
Frontend šalje već gotov niz objekata sa `role` poljem. Backend samo uzima taj niz (`...messages`) i lepi ga iza system poruke.

**Šta je AbortController i čemu služi?**
Ugrađen browser alat za prekid `fetch` poziva. `new AbortController()`, njegov `.signal` se prosleđuje u `fetch`, `.abort()` metoda prekida zahtev — koristi se za dugme "Prekini generisanje".

**Zašto koristimo `finally` blok za `setLoading(false)`?**
`finally` se izvršava UVEK, bilo da je poziv uspeo ili pukao — garantuje da loading state ne ostane "zaglavljen" ni u slučaju greške.

**Šta radi `react-markdown`?**
Parsira Markdown tekst (bold, liste, blokove koda) i renderuje ga kao prave formatirane HTML/React elemente.

**Zašto liste iz react-markdown mogu čudno da izgledaju (tačke na jednom mestu, tekst na drugom)?**
Nedostaje CSS stil za `<ul>`/`<li>`/`<p>` elemente koje `react-markdown` generiše. Rešenje: dodati CSS klasu (npr. `.chat-message ul { padding-left: 1.5rem }`) i omotati `ReactMarkdown` u `<div className="chat-message">`.

**Kako radi auto-scroll na dno chata?**
`useRef(null)` pravi referencu na prazan `<div>` na dnu liste poruka. `useEffect(() => { ref.current?.scrollIntoView({behavior: 'smooth'}) }, [messages])` se pokreće svaki put kad `messages` niz promeni — automatski skroluje na taj element.

---

## 1.4 Structured Output / JSON

**Zašto structured output umesto slobodnog teksta?**
Slobodan tekst je nepredvidiv format — nemoguće ga je pouzdano programski parsirati. JSON u fiksnom formatu se može direktno validirati i koristiti u kodu.

**Kako se garantuje da model vrati validan JSON?**
`response_format: { type: 'json_object' }` parametar u OpenAI pozivu.

**Zašto validacija mora biti na backendu?**
Korisnik (ili bilo ko ko gađa API direktno) može poslati bilo šta. Ne kontrolišemo šta ULAZI, ali kontrolišemo šta IZLAZI i šta se IZVRŠAVA.

**Šta se proverava u validaciji?**
- Tip podatka (`typeof x === 'number'`)
- Poslovna logika (npr. količina ne sme biti 0 ili negativna)
- Ako validacija ne prođe → `res.status(400).json({ error: ... })` + `return`

**Gde "vraća" model odgovor — kome?**
Isključivo našem backend kodu, nikad direktno korisniku. Tok: Browser → Node backend → OpenAI → nazad Node backendu → (validacija) → nazad browseru.

---

## SQL osnove (za bazu)

**SELECT** — čita podatke: `SELECT * FROM kupci;`

**WHERE** — filtrira: `SELECT * FROM kupci WHERE ime = 'Marko';`

**LIKE + %** — pretraga po delu teksta: `WHERE ime LIKE '%Marko%'` — pronalazi sve što SADRŽI "Marko"

**JOIN** — spaja podatke iz više povezanih tabela:
```sql
SELECT kupci.ime, proizvodi.naziv
FROM porudzbine
JOIN kupci ON porudzbine.kupac_id = kupci.id
JOIN proizvodi ON porudzbine.proizvod_id = proizvodi.id
```

**Zašto JOIN?** Tabela `porudzbine` čuva samo ID-jeve — JOIN "spaja" ID-jeve sa pravim podacima iz drugih tabela.

**Zašto `?` placeholder umesto direktnog lepljenja vrednosti u SQL string?**
Bezbednosna praksa — sprečava SQL injection. `db.prepare('... WHERE ime LIKE ?')` pa `.run(vrednost)`.

**ORDER BY ... DESC** — sortira rezultate, `DESC` = opadajuće (najnovije prvo).

---

## Baza podataka — naša konkretna struktura

**Tri tabele:**
- `kupci` (id, ime, email)
- `proizvodi` (id, naziv, kategorija, cena, opis, embedding) — `opis` je tekst proizvoda, `embedding` je vektor sačuvan kao JSON tekst
- `porudzbine` (id, kupac_id, proizvod_id, kolicina, datum) — FOREIGN KEY veze

**Šta je FOREIGN KEY?**
Veza između tabela — garantuje da porudžbina uvek referencira postojećeg kupca/proizvod.

**Zašto SQLite (better-sqlite3) umesto PostgreSQL/MySQL?**
SQLite = jedan fajl na disku, bez posebnog servera — idealno za učenje/demo. PostgreSQL/MySQL = pravi server, koristi se u produkciji sa više korisnika. Kod (funkcije, validacija, JOIN) je konceptualno isti bez obzira na bazu.

**Šta je seed skripta?**
Puni praznu bazu test podacima. Prvo briše postojeće (`DELETE FROM ...`), pa ubacuje nove — ponovljiva je.

**Kako pogledati sadržaj .db fajla?**
To je binarni fajl, ne otvara se kao tekst. Opcije: VS Code ekstenzija "SQLite Viewer", komanda `sqlite3 kingdom.db` u terminalu (pa SQL upiti direktno), ili desktop app DB Browser for SQLite.

**Rešeni problem: better-sqlite3 segfault na starijem sistemu**
- Node-gyp kompajliranje je zahtevalo Xcode Command Line Tools (`xcode-select --install`)
- Najnovija verzija (13.x) je pravila Segmentation fault na Node 20.9/macOS Big Sur
- Rešenje: `better-sqlite3@9.6.0` (starija, stabilnija verzija za tu kombinaciju)
- Lekcija: EBADENGINE upozorenja NISU uvek bezopasna

---

## Naše funkcije (functions.js)

**pronadjiKupca({ ime })**
```javascript
db.prepare('SELECT * FROM kupci WHERE ime LIKE ?').all(`%${ime}%`)
```
Vraća SVE kupce čije ime sadrži uneti tekst. Pazi: "Marko" pronalazi i "Jelena Marković", jer je "Marko" deo prezimena "Marković".

**istorijaKupovine({ kupacId, brojMeseci })**
```javascript
SELECT proizvodi.naziv, porudzbine.kolicina, porudzbine.datum
FROM porudzbine
JOIN proizvodi ON porudzbine.proizvod_id = proizvodi.id
WHERE porudzbine.kupac_id = ?
ORDER BY porudzbine.datum DESC
```
Vraća listu kupovina za jednog kupca, najnovije prvo. `brojMeseci` je opcioni filter ("u poslednjih 6 meseci"): datum granice se računa u JavaScript-u i ubacuje kroz `?` parametar, a SQL tekst ostaje fiksan.

---

## 2.1 Tool / Function Calling (implementirano i testirano)

**Osnovna ideja?**
Model ne izvršava kod sam — PREDLAŽE koju funkciju treba pozvati i sa kojim parametrima. Backend prima predlog, validira, stvarno izvršava, vraća rezultat.

**Kako se definišu tools u API pozivu?**
```javascript
tools: [{
  type: 'function',
  function: {
    name: 'pronadjiKupca',
    description: '...',  // OVO ČITA MODEL da odluči kad da je koristi
    parameters: { type: 'object', properties: {...}, required: [...] }
  }
}]
```

**Kako izgleda odgovor kad model hoće da pozove funkciju?**
```javascript
{ role: 'assistant', content: null, tool_calls: [{ id: '...', function: { name: '...', arguments: '{"ime": "Marko"}' } }] }
```
`arguments` je STRING — mora se `JSON.parse()`-ovati.

**Šta je dostupneFunkcije mapa?**
Objekat koji povezuje ime funkcije (string, ono što model vrati) sa pravom JS funkcijom:
```javascript
const dostupneFunkcije = { pronadjiKupca, istorijaKupovine };
// poziv: dostupneFunkcije['pronadjiKupca'](argumenti)  — ceo objekat, vidi "Imenovani argumenti" niže
```

**Zašto je /chat ruta sad while petlja, ne jedan poziv?**
Model može tražiti VIŠE poziva funkcija zaredom (npr. prvo pronadjiKupca da dobije ID, pa istorijaKupovine sa tim ID-jem) pre nego što da finalni tekstualni odgovor. Petlja se ponavlja dok god poruka.tool_calls postoji; kad model konačno vrati običan tekst (bez tool_calls), petlja se zaustavlja i taj tekst se šalje korisniku.

**Ceo tok (7 koraka)?**
1. Korisnik pita nešto
2. Backend šalje poruku modelu + listu `tools`
3. Model vraća `tool_calls` (ne tekst)
4. Backend validira parametre i IZVRŠAVA pravu funkciju (npr. dostupneFunkcije[ime](...args))
5. Backend dobija pravi rezultat (iz baze)
6. Rezultat se šalje NAZAD modelu kao poruka sa `role: 'tool'` i `tool_call_id`
7. Model formuliše finalni tekstualni odgovor NA OSNOVU pravog podatka

**Zašto tool_call_id?**
Povezuje rezultat funkcije sa TAČNIM pozivom na koji odgovara — bitno kad model traži više funkcija odjednom u istom odgovoru.

**Zašto se rezultat šalje nazad modelu umesto da ga backend direktno pokaže korisniku?**
Model "prevodi" sirovi podatak (JSON iz baze) u prirodan, čitljiv jezik — ali ne izmišlja sadržaj, samo formuliše ono što mu je backend stvarno vratio.

**Ko (frontend ili backend) šalje tools listu modelu?**
Isključivo BACKEND. Frontend samo šalje `messages` niz i prima tekstualan odgovor (`data.reply`) — nesvestan je da li je odgovor došao direktno ili je usput pozvao neku funkciju.

**Zašto je ovo bezbedno?**
- Mi definišemo TAČNO koje funkcije postoje — model ne može izmisliti nepostojeću funkciju
- Bezbednosna provera `if (!funkcija)` hvata slučaj da model traži nešto što ne postoji u mapi
- Mi izvršavamo stvaran kod — model nema direktan pristup bazi

**Bug koji smo rešili: sirov JSON u UI-ju**
Kad je /chat ruta promenjena da vraća `res.json({reply: ...})` umesto streaming teksta, frontend je i dalje radio `response.text()` — pa se u chatu video ceo sirov `{"reply":"..."}` string sa `\n` oznakama. Ispravka: `response.json()` + `data.reply`. (Kasnije zamenjeno čitanjem streama, vidi "Streaming (NDJSON)".)

**Bug: curl "ćutao" u VS Code terminalu**
Isti curl komanda je odmah radila u običnom Terminal.app, ali "visila" bez odgovora u VS Code integrisanom terminalu. Rešenje: koristiti spoljašnji terminal za curl testiranje, VS Code terminal samo za `npm run dev`.

**Kako popraviti "kupca" umesto "kupac" (gramatika modela na srpskom)?**
Preciznija system poruka: "Odgovaraj na gramatički ispravnom srpskom jeziku, jasno i profesionalno." — model je manje treniran na srpskom pa pravi sitne greške, jasna instrukcija u system poruci pomaže.

---

## Opšti principi (provlače se kroz sve)

1. **Nikad ne veruj slepo AI odgovoru koji ide dalje u sistem** — uvek validiraj na backendu pre upisa/akcije
2. **AI predlaže, backend odlučuje** — model nikad direktno ne dira bazu ili ne izvršava akcije
3. **Korisnik može poslati bilo šta** (čak i mimo UI-ja, direktno na API) — kontrolišemo izlaz i izvršavanje, ne ulaz
4. **Redosled u Node fajlu je bitan** — const se ne "hoistuje", mora biti definisano pre upotrebe
5. **git add/commit uvek iz korena projekta**, ne iz podfoldera
6. **Frontend i backend format odgovora moraju da se poklapaju** — ako backend promeni res.write → res.json, frontend mora response.text() → response.json()
7. **Kvalitet RAG-a zavisi od podataka i od upita** — opisi proizvoda i formulacija upita menjaju rezultat više nego sam kod
8. **Svaki spoljašnji poziv može da zakaže** — retry sa pauzom, limiti, praćenje troška
9. **Test uvek na čistom razgovoru** — model prepisuje stare odgovore iz istorije

---

## 2.2 Embeddings i semantic search

**Šta je embedding?**
Niz brojeva (kod nas 1536) koji predstavlja *značenje* teksta. Slični tekstovi imaju slične nizove. Pravi ga poseban model (`text-embedding-3-small`), ne chat model.

**Šta je semantic search i po čemu se razlikuje od `LIKE`?**
`LIKE '%kamera%'` traži slova. Semantic search poredi značenje: upit "hladnjak za procesor" pronalazi "Vazdušni kuler za procesor" iako reč "hladnjak" ne postoji nigde u opisu.

**Kako se meri sličnost?**
Cosine similarity: ugao između dva vektora, rezultat od -1 do 1 (1 = isto značenje, 0 = nepovezano). Kod: skalarni proizvod podeljen proizvodom dužina vektora.

**Kako izgleda pretraga?**
1. Upit → embedding (jedan poziv ka OpenAI-ju)
2. Cosine similarity sa vektorom svakog proizvoda
3. Sortiranje po skoru, uzimamo prvih 5

**Zašto embeddinge računamo unapred i čuvamo?**
Sa stotinama proizvoda bi svaka pretraga pravila stotine API poziva (sporo i košta). Zato skripta `generisi-embeddinge.js` jednom izračuna vektore (u grupama po 100 tekstova u jednom pozivu) i upiše ih u kolonu `embedding` kao JSON tekst (`JSON.stringify`, pri čitanju `JSON.parse`). Posle svakog `node seed.js` mora ponovo da se pokrene, jer seed briše proizvode zajedno sa vektorima.

**Šta ulazi u tekst za embedding proizvoda?**
`naziv. Kategorija: ... opis`. Opis nosi značenje (za šta se proizvod koristi), pa je pretraga bolja nego kad je samo naziv.

**Šta je keš (Map) u `generisiEmbedding`?**
Isti tekst se ne šalje dvaput OpenAI-ju: ako smo već izračunali vektor za taj tekst, vraća se iz memorije. Prazni se pri restartu servera.

**Da li je potrebna prava vektorska baza?**
Za stotine proizvoda ne: SQLite + petlja u JavaScript-u je dovoljno brza (milisekunde). Prava vektorska baza (Pinecone, pgvector...) treba za desetine hiljada i više zapisa.

**Zašto modelu nikad ne vraćamo sirov vektor?**
1536 brojeva po proizvodu bi bilo hiljade tokena uzalud. Funkcija vraća samo naziv, kategoriju, cenu, opis i skor.

**Šta smo naučili testom sa 239 proizvoda?**
- Pretraga stvarno razume značenje (hladnjak → kuler, nadzor → IP kamera).
- Kratki upiti su loši: "nadzor dvorišta" daje skorove oko 0.39 za sve, bez razmaka (nasumični rezultati). "IP kamera za video nadzor dvorišta" daje 0.77 i jasan razmak do ostalih (0.53).
- Lažni pogoci se dešavaju (npr. "zaštita" → zaštitno staklo). Skorovi nisu procenti; važan je razmak između prvih i ostalih.

**Kako smo popravili kratke upite?**
Opisom parametra alata `pretraziProizvode`: model je instruiran da pošalje pun opis (vrsta proizvoda + namena). Opis parametra je deo "uputstva" koje model čita.

---

## 2.3 RAG (Retrieval-Augmented Generation)

**Šta je RAG?**
Pre nego što model odgovori, pronađemo relevantan tekst iz naših podataka i damo ga modelu da odgovori na osnovu njega. Tako ne izmišlja, nego koristi stvarnu dokumentaciju.

**Kako je RAG izveden kod nas?**
Kao tool: `pretraziDokumentaciju(upit)` poredi embedding upita sa embeddingom svake FAQ stavke (`dokumentacija.js`: povraćaj 14 dana, garancija 24 meseca, dostava) i vraća 2 najbliže. Tok: React → Node → pretraga → LLM → odgovor.

**Šta se desi bez RAG-a?**
Na pitanje "šta je RAG" model je odgovorio "Red-Amber-Green" (pogrešno značenje), jer nije imao kontekst. To je primer hallucination-a.

**Šta je prompt injection?**
Tekst (od korisnika ili iz dokumenta) koji pokušava da prepiše instrukcije modela. Zato: validacija na backendu, ograničeni alati i provera dozvola pri izvršavanju, a ne samo u promptu.

---

## 2.4 AI agenti

**Šta je agent?**
Model koji u petlji sam bira koji alat da pozove, vidi rezultat i odlučuje šta dalje, dok ne završi. Naša /chat petlja je upravo to.

**Zašto MAX_KORAKA?**
Zaštita od beskonačne petlje i neočekivanog troška: petlja staje posle najviše 8 koraka.

**Primer lanca:**
"Predloži Jeleni 3 proizvoda" → `pronadjiKupca` (dobije id) → `predloziProizvode` (dobije predloge) → tekstualni odgovor. Model sam zaključi da mu treba id.

**ReAct vs plan-and-execute?**
ReAct: razmišljaj, uradi korak, pogledaj rezultat, ponovi (naš pristup). Plan-and-execute: prvo napravi ceo plan, pa ga izvrši.

**Kratka vs dugoročna memorija?**
Kratka: istorija poruka u jednom razgovoru (šaljemo je pri svakom pozivu). Dugoročna: podaci koji prežive razgovor (baza, memorija korisnika).

**Kako radi `predloziProizvode`?**
Profil kupca = prosek vektora svega što je kupio. Kandidati = proizvodi koje nije kupio (`WHERE id NOT IN (...)`, pravilo izvršava kod, ne model). Rangira se po cosine similarity sa profilom, prvih 5.
Ograničenje: prosečan vektor daje "slično", ne "dopunu" (kupac sa SSD-om dobija još SSD-ova); za produkciju bi trebalo birati iz drugih kategorija ili izbacivati skoro identične.

**Imenovani argumenti umesto `Object.values`**
Staro: `funkcija(...Object.values(argumenti))` šalje vrednosti po redosledu, pa ako model pošalje `{brojMeseci: 6, kupacId: 1}`, funkcija dobija pogrešne vrednosti i to bez ikakve greške. Novo: `funkcija(argumenti)` i potpis `function istorijaKupovine({ kupacId, brojMeseci })`, pa se polja uzimaju po imenu.

---

## 2.5 Integracije, baza, autentifikacija

**Kako AI nikad ne dira bazu direktno?**
Samo kroz naše backend funkcije. Model predlaže poziv, backend proverava i izvršava.

**Kako radi login?**
`POST /login` prima korisničko ime i lozinku, vraća token, ime i ulogu. Frontend čuva sesiju u `sessionStorage` (preživi refresh, nestaje zatvaranjem taba) i šalje token u headeru `x-api-token`.

**Zašto ista greška i za pogrešno ime i za pogrešnu lozinku?**
Da napadač ne može da sazna koja korisnička imena postoje.

**Kako radi provera tokena?**
Express middleware `proveriToken` pronalazi korisnika po tokenu; bez tokena ili sa pogrešnim vraća 401. Postavlja `req.korisnik`.

**Kako rade dozvole po ulozi?**
Mapa uloga → dozvoljeni alati (`prodaja`: svih 5; `podrska`: samo pretraga proizvoda i dokumentacije). Dve provere: (1) lista alata koja se šalje modelu se filtrira, pa model ni ne zna da drugi postoje; (2) pri izvršavanju se proverava ponovo, jer se ne oslanjamo na prompt.

**Šta je nebezbedno u našem demu?**
Lozinke u običnom tekstu, fiksni tokeni, nema JWT-a ni bcrypt-a, sesija u sessionStorage, rate-limit brojači u memoriji. Za demo je ok, u produkciji ne.

---

## Rate limiting, retry i praćenje troška

**Zašto rate limit?**
Zaštita od zloupotrebe i računa za API. `express-rate-limit`: login max 5 neuspelih pokušaja na 15 minuta (`skipSuccessfulRequests`), chat 10 poruka u minutu po korisniku (ključ je ime iz tokena, ne IP). Prekoračenje vraća 429.

**Šta je retry sa exponential backoff-om?**
Privremene greške (429, 5xx, prekid veze) se ponavljaju sa sve dužom pauzom: 1s, 2s, 4s... uz **jitter** (nasumični dodatak, da se klijenti ne sudaraju) i poštovanje `Retry-After` headera. Ponavljamo samo 408/409/429/5xx i greške veze; greške poput 401 (pogrešan ključ) nikad. Max 4 pokušaja.

**Zašto `maxRetries: 0` na OpenAI klijentu?**
Da retry radi samo naš omotač (`pozoviSaPonavljanjem`), a ne i ugrađeni mehanizam (inače bi se ponavljanja množila).

**Kako pratimo potrošnju?**
`pracenje.js` posle svakog poziva upisuje red JSON-a u `ai-pozivi.log` (tip, model, korisnik, tokeni, trajanje), bez teksta poruka (privatnost). `GET /potrosnja` vraća zbir. Cena = tokeni × cena po milionu tokena (gpt-4o-mini 0.15 ulaz / 0.60 izlaz; embeddings 0.02, proveriti na zvaničnom cenovniku). Brojač u memoriji se nulira pri restartu, log ne.

**Zašto `*.log` u `.gitignore`?**
Log sadrži podatke o korisnicima i raste; ne ide na Git.

---

## Streaming (NDJSON)

**Šta je NDJSON?**
Newline-delimited JSON: svaki red je jedan JSON događaj. Tipovi: `{"tip":"tekst","sadrzaj":"..."}`, `{"tip":"greska","poruka":"..."}`, `{"tip":"kraj"}`.

**Kako radi backend?**
`stream: true` + `stream_options: { include_usage: true }`. Tekstualni delovi se odmah prosleđuju klijentu. Pozivi alata stižu u fragmentima (deo imena, deo argumenata) i skupljaju se po `index`; funkcija se izvršava tek kad je poziv kompletan. Poslednji deo nosi `usage`, pa i dalje beležimo tokene.

**Zašto status ne može da se promeni usred streama?**
`res.flushHeaders()` šalje status odmah. Posle toga greška mora kao događaj u toku (`{"tip":"greska"}`). Zato 401 i 429 stižu pre toka kao običan JSON.

**Zašto retry samo pre prvog primljenog dela?**
Posle prvog dela bi ponovni pokušaj duplirao već prikazan tekst.

**Kako server zna da je korisnik odustao?**
`res.on('close')` bez `res.writableEnded` postavlja `klijentOdustao`; petlja staje i ne troši nove tokene (u logu: "Klijent je prekinuo vezu").

**Kako frontend čita tok?**
`response.body.getReader()` + `reader.read()` u petlji. `TextDecoder` sa `{ stream: true }` čuva bajt slova poput ž/č/ć/š/đ koje stigne presečeno između delova. Bafer `ostatak`: deo ne mora da se završava na kraju reda, pa se poslednji nedovršeni red čuva za sledeći deo. Svaki kompletan red → `JSON.parse` → po tipu događaja.

**Šta ako veza pukne usred odgovora?**
Ako stream završi bez događaja `kraj`, prikazuje se "Veza je prekinuta pre kraja odgovora."

**Odjava usred odgovora?**
`controller.abort()` u `odjaviSe`, da tok ne nastavi da teče za sledećeg korisnika.

---

## 2.6 MCP (Model Context Protocol)

**Šta je MCP?**
Standardni protokol kojim AI aplikacija (klijent) pita drugi program (server): koje alate imaš i pozovi alat X. Kao USB: jedan standard, pa server jednom napišeš i svaki MCP klijent ga koristi. Bez njega svaka aplikacija ručno piše svoje povezivanje (kao naš niz `tools` u `index.js`).

**Koja je sekvenca poruka?**
1. `initialize`: klijent se predstavi, server odgovori verzijom protokola i mogućnostima (`capabilities`).
2. `notifications/initialized`: obaveštenje (nema `id`, nema odgovora).
3. `tools/list`: server vraća alate (`name`, `description`, `inputSchema`).
4. `tools/call`: klijent šalje `name` i `arguments`, server vraća `content`.

**U kom je formatu?**
JSON-RPC 2.0 preko stdin/stdout (stdio transport), po jedna poruka u redu. Zahtev ima `id`, odgovor isti `id`.

**Kako se MCP alat razlikuje od našeg OpenAI alata?**
Skoro nikako: `inputSchema` je isti JSON Schema kao `parameters`. Razlika je ko vodi petlju: kod nas backend, kod MCP-a klijent, a server samo izlaže alate.

**Zašto `console.log` u MCP serveru ide na stderr?**
Stdout je kanal protokola. Bilo kakav običan ispis (i `dotenv` ispisuje tip pri učitavanju) pokvario bi poruke. Zato `console.log = console.error`.

**Kako se prijavljuju greške?**
Greška alata: običan rezultat sa `isError: true` (model može da je pročita). Nepoznat alat ili metoda: JSON-RPC `error` sa kodom (-32602, -32601).

**U produkciji?**
Koristi se zvanični MCP SDK, a ne ručni JSON-RPC. Naš server je napisan ručno da se vidi šta se zaista dešava.

---

## Pouke iz razvoja (greške koje smo rešili)

- **Bela strana posle logina:** nedostajala/pogrešno napisana funkcija (`stopGenaration`). Prvo F12 → Console.
- **Duple deklaracije u `index.js`:** server ne startuje; proveri terminal gde radi `npm run dev`.
- **Odjava nije čistila polja:** `odjaviSe` mora da resetuje sve stanje, ne samo token.
- **`*.log` u git status-u:** dodati u koreni `.gitignore` (ne onaj u `client/`).
- **Model prepisuje stare odgovore:** za test pretrage osveži stranicu, jer istorija utiče na odgovor.
- **Model dopisuje opise:** instrukcija u system poruci ("prenosi opise tačno, preporuči samo relevantne") ublažava, ali ne garantuje.
- **Gramatika na srpskom:** mali model greši; jasna instrukcija o jeziku i pismu pomaže, ali ne uklanja greške u potpunosti.
- **Posle brisanja baze:** pokreni `node seed.js`, pa `node generisi-embeddinge.js`.