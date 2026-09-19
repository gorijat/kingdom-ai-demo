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