# Kingdom AI — Checklist (SVE stavke iz originalnog plana)

## 1.1 Osnove AI i LLM modela
- [x] Šta su LLM modeli i kako rade na praktičnom nivou
- [x] Tokeni, context window, temperature i ograničenja modela
- [x] System, user i assistant poruke
- [x] Osnove prompt engineeringa — [TEORIJA + praksa kroz system prompt]
- [x] Hallucinations, validacija rezultata, sigurnosna ograničenja — [TEORIJA]
- [x] Pregled vodećih modela, cloud vs open-source — [TEORIJA]

## 1.2 AI API integracija kroz NodeJS
- [x] Slanje zahteva AI modelu
- [x] Streaming odgovora (backend) — napomena: /chat sada NIJE streaming zbog tool callinga, vraćamo se na ovo
- [x] Error handling, rate limits, retry logika — [TEORIJA urađena, KOD u Sedmici 4]
- [x] Sigurno čuvanje API ključeva
- [x] Praćenje tokena, troškova, logovanje — [KOD u Sedmici 4]

## 1.3 ReactJS + AI
- [x] Jednostavan chat interfejs
- [x] Istorija razgovora i upravljanje stanjem
- [x] Streaming teksta u realnom vremenu (UI) — odloženo, vraćamo se posle tool callinga
- [x] Loading/error states i prekid generisanja
- [x] Markdown i prikaz koda
- [x] Komunikacija React ↔ NodeJS

## 1.4 Structured Output / JSON
- [x] Pouzdani strukturirani rezultati
- [x] Definisanje JSON struktura
- [x] Validacija odgovora prije akcije
- [x] Zašto je structured output važniji od slobodnog teksta — [TEORIJA]

## 2.1 Tool / Function Calling
- [x] Kako AI bira unaprijed definisanu backend funkciju
- [x] Prosljeđivanje i validacija parametara
- [x] Pozivanje internih API-ja i vraćanje rezultata modelu
- [x] Odvajanje: AI odlučuje, backend kontroliše
(implementirano: pronadjiKupca + istorijaKupovine, testirano end-to-end preko curl-a, radi višekoračni poziv)

## 2.2 Embeddings i semantic search
- [x] Šta su embeddings i čemu služe
- [x] Osnove similarity pretrage i vector baza
- [x] Semantic search nad proizvodima/dokumentima
- [x] Test sa najmanje nekoliko stotina zapisa

## 2.3 RAG
- [x] Povezivanje AI modela sa internom dokumentacijom
- [x] Rad sa PDF/FAQ/podacima o proizvodima
- [x] Retrieval relevantnog sadržaja prije generisanja
- [x] Tok: React → NodeJS → pretraga → LLM → odgovor

## 2.4 AI Agents
- [x] Agent loop i višekoračni zadaci
- [x] Tools, planning, kontrolisana memorija
- [x] Kombinovanje više funkcija u jedan proces

## 2.5 Povezivanje sa postojećim sistemima
- [x] REST API integracije — [TEORIJA]
- [x] Baza podataka (SQLite u našem slučaju) — [KOD urađeno kroz 2.1, formalno se štiklira ovde]
- [x] Authentication, permissions, kontrola pristupa
- [x] AI nema direktan pristup bazi, samo kroz backend funkcije — [već primenjeno u praksi kroz tool calling]

## 2.6 MCP
- [x] Osnovni koncept MCP-a
- [x] Kako se AI standardizovano povezuje sa alatima/servisima
- [x] Jednostavan testni MCP server (opciono)