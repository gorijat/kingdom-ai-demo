# Kingdom AI — Checklist (SVE stavke iz originalnog plana)

## 1.1 Osnove AI i LLM modela
- [x] Šta su LLM modeli i kako rade na praktičnom nivou
- [x] Tokeni, context window, temperature i ograničenja modela
- [x] System, user i assistant poruke
- [ ] Osnove prompt engineeringa
- [ ] Hallucinations, validacija rezultata i sigurnosna ograničenja
- [ ] Pregled vodećih modela, cloud vs open-source

## 1.2 AI API integracija kroz NodeJS
- [x] Slanje zahteva AI modelu iz NodeJS backenda
- [x] Streaming odgovora prema frontendu (backend strana)
- [ ] Error handling, rate limits i retry logika
- [x] Sigurno čuvanje API ključeva u .env
- [ ] Praćenje tokena, troškova i logovanje AI poziva

## 1.3 ReactJS + AI
- [x] Izrada jednostavnog chat interfejsa
- [ ] Istorija razgovora i upravljanje stanjem
- [ ] Streaming teksta u realnom vremenu (UI strana)
- [ ] Loading/error states i prekid generisanja
- [ ] Markdown i prikaz programskog koda
- [x] Komunikacija React frontenda sa NodeJS AI backendom

## 1.4 Structured Output / JSON
- [ ] Naučiti model da vraća pouzdane strukturirane rezultate
- [ ] Definisati JSON strukture koje aplikacija može direktno koristiti
- [ ] Validirati odgovor prije upisa ili izvršavanja akcije
- [ ] Razumjeti zašto je strukturirani output važniji od slobodnog teksta

## 2.1 Tool / Function Calling
- [ ] Kako AI bira unaprijed definisanu backend funkciju
- [ ] Prosljeđivanje i validacija parametara
- [ ] Pozivanje internih API-ja i vraćanje rezultata modelu
- [ ] Odvajanje: AI odlučuje, backend kontroliše

## 2.2 Embeddings i semantic search
- [ ] Šta su embeddings i čemu služe
- [ ] Osnove similarity pretrage i vector baza
- [ ] Semantic search nad proizvodima/dokumentima
- [ ] Test sa najmanje nekoliko stotina zapisa

## 2.3 RAG
- [ ] Povezivanje AI modela sa internom dokumentacijom
- [ ] Rad sa PDF/FAQ/podacima o proizvodima
- [ ] Retrieval relevantnog sadržaja prije generisanja
- [ ] Tok: React → NodeJS → pretraga → LLM → odgovor

## 2.4 AI Agents
- [ ] Agent loop i višekoračni zadaci
- [ ] Tools, planning, kontrolisana memorija
- [ ] Kombinovanje više funkcija u jedan proces

## 2.5 Povezivanje sa postojećim sistemima
- [ ] REST API integracije
- [ ] Baza podataka (SQLite u našem slučaju)
- [ ] Authentication, permissions, kontrola pristupa
- [ ] AI nema direktan pristup bazi, samo kroz backend funkcije

## 2.6 MCP
- [ ] Osnovni koncept MCP-a
- [ ] Kako se AI standardizovano povezuje sa alatima/servisima
- [ ] Jednostavan testni MCP server (opciono)