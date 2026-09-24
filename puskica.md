# Kingdom AI — Puškica (pitanje/odgovor)

Sve pređeno gradivo do sada, u formatu "ako me pitaju, šta odgovaram".

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
NAPOMENA: kad smo dodali tool calling, /chat ruta je privremeno PRESTALA da bude streaming (koristi res.json() na kraju) — jer stream + tool calling zajedno zahteva složeniju logiku. Vraćamo se na ovo kasnije.

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
- `proizvodi` (id, naziv, kategorija, cena)
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

**pronadjiKupca(ime)**
```javascript
db.prepare('SELECT * FROM kupci WHERE ime LIKE ?').all(`%${ime}%`)
```
Vraća SVE kupce čije ime sadrži uneti tekst.

**istorijaKupovine(kupacId)**
```javascript
SELECT proizvodi.naziv, porudzbine.kolicina, porudzbine.datum
FROM porudzbine
JOIN proizvodi ON porudzbine.proizvod_id = proizvodi.id
WHERE porudzbine.kupac_id = ?
ORDER BY porudzbine.datum DESC
```
Vraća listu kupovina za jednog kupca, najnovije prvo.

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
// poziv: dostupneFunkcije['pronadjiKupca'](...)
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
Kad je /chat ruta promenjena da vraća `res.json({reply: ...})` umesto streaming teksta, frontend je i dalje radio `response.text()` — pa se u chatu video ceo sirov `{"reply":"..."}` string sa `\n` oznakama. Ispravka: `response.json()` + `data.reply`.

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