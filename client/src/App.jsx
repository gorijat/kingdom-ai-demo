import { useState, useEffect, useRef } from 'react';
import './App.css';
import ReactMarkdown from 'react-markdown';

function ucitajSesiju() {
  try {
    return JSON.parse(sessionStorage.getItem('kingdomSesija')) || {};
  } catch {
    return {};
  }
}

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [controller, setController] = useState(null);

  const [token, setToken] = useState(() => ucitajSesiju().token || null);
  const [imeKorisnika, setImeKorisnika] = useState(() => ucitajSesiju().ime || '');
  const [ulogaKorisnika, setUlogaKorisnika] = useState(() => ucitajSesiju().uloga || '');
  const [korisnickoIme, setKorisnickoIme] = useState('');
  const [lozinka, setLozinka] = useState('');
  const [loginGreska, setLoginGreska] = useState('');

  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Dok tekst curi koristimo običan skrol, glatki bi "zaostajao" za svakim novim delom
    messagesEndRef.current?.scrollIntoView({ behavior: loading ? 'auto' : 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    // Odmah dodajemo prazan odgovor asistenta, u njega se upisuje tekst kako stiže
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);
    setError(null);

    const newController = new AbortController();
    setController(newController);

    let odgovor = '';
    let primioKraj = false;

    try {
      const response = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': token
        },
        signal: newController.signal,
        body: JSON.stringify({ messages: newMessages }),
      });

      // 401 (token) i 429 (limit) stižu kao obične JSON greške, pre početka streama
      if (!response.ok) {
        let poruka = 'Server je vratio grešku.';
        try {
          const data = await response.json();
          if (data.error) poruka = data.error;
        } catch {
          // telo nije JSON, ostaje opšta poruka
        }
        setError(poruka);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let ostatak = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // stream: true čuva slovo (ž, č, ć, š, đ) koje je stiglo presečeno između dva dela
        ostatak += decoder.decode(value, { stream: true });

        // Deo ne mora da se poklopi sa granicom reda: poslednji (nedovršen) red čekamo
        const redovi = ostatak.split('\n');
        ostatak = redovi.pop();

        for (const red of redovi) {
          if (!red.trim()) continue;

          let dogadjaj;
          try {
            dogadjaj = JSON.parse(red);
          } catch {
            continue;
          }

          if (dogadjaj.tip === 'tekst') {
            odgovor += dogadjaj.sadrzaj;
            setMessages([...newMessages, { role: 'assistant', content: odgovor }]);
          } else if (dogadjaj.tip === 'greska') {
            setError(dogadjaj.poruka);
            primioKraj = true;
          } else if (dogadjaj.tip === 'kraj') {
            primioKraj = true;
          }
        }
      }

      if (!primioKraj) {
        setError('Veza je prekinuta pre kraja odgovora.');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Generisanje je prekinuto.');
      } else {
        setError('Nešto nije uspelo. Proveri da li je backend server pokrenut.');
      }
    } finally {
      setLoading(false);
      setController(null);
      // Prazan odgovor (greška ili prekid pre prvog teksta) ne ostaje u istoriji
      setMessages(prev => prev.filter(m => m.content !== ''));
    }
  };

  const stopGeneration = () => {
    if (controller) {
      controller.abort();
    }
  };

  const prijaviSe = async () => {
    setLoginGreska('');
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ korisnickoIme, lozinka }),
      });

      if (!response.ok) {
        const data = await response.json();
        setLoginGreska(data.error || 'Prijava nije uspela.');
        return;
      }

      const data = await response.json();
      setToken(data.token);
      setImeKorisnika(data.ime);
      setUlogaKorisnika(data.uloga);

      sessionStorage.setItem('kingdomSesija', JSON.stringify({
        token: data.token,
        ime: data.ime,
        uloga: data.uloga
      }));
    } catch (err) {
      setLoginGreska('Ne mogu da se povežem sa serverom.');
    }
  };

  const odjaviSe = () => {
    // Ako odgovor još stiže, prekidamo ga, da ne nastavi da curi za sledećeg korisnika
    if (controller) controller.abort();

    sessionStorage.removeItem('kingdomSesija');
    setToken(null);
    setImeKorisnika('');
    setUlogaKorisnika('');
    setMessages([]);
    setKorisnickoIme('');
    setLozinka('');
    setLoginGreska('');
    setInput('');
    setError(null);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Kingdom AI Assistant</h1>

      {!token ? (
        <div>
          <h3>Prijava</h3>
          <input
            type="text"
            value={korisnickoIme}
            onChange={(e) => setKorisnickoIme(e.target.value)}
            placeholder="Korisničko ime"
            style={{ width: '80%', padding: '0.5rem', marginBottom: '0.5rem', display: 'block' }}
          />
          <input
            type="password"
            value={lozinka}
            onChange={(e) => setLozinka(e.target.value)}
            placeholder="Lozinka"
            style={{ width: '80%', padding: '0.5rem', marginBottom: '0.5rem', display: 'block' }}
          />
          <button onClick={prijaviSe}>Prijavi se</button>

          {loginGreska && (
            <div style={{ color: 'red', marginTop: '0.5rem' }}>
              {loginGreska}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            Prijavljen kao: <strong>{imeKorisnika}</strong> ({ulogaKorisnika})
            <button onClick={odjaviSe} style={{ marginLeft: '1rem' }}>Odjavi se</button>
          </div>

          <div style={{ border: '1px solid #ccc', padding: '1rem', maxHeight: '400px', overflowY: 'auto', marginBottom: '1rem' }}>
            {messages.map((msg, index) => (
              <div key={index} style={{ marginBottom: '0.5rem' }}>
                <strong>{msg.role === 'user' ? 'Ti: ' : 'AI: '}</strong>
                {msg.content === '' ? (
                  <em>Razmišljam...</em>
                ) : (
                  <div className="chat-message">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Postavi pitanje..."
            style={{ width: '80%', padding: '0.5rem' }}
          />
          <button onClick={sendMessage} disabled={loading}>
            {loading ? 'Šaljem...' : 'Pošalji'}
          </button>
          {loading && (
            <button onClick={stopGeneration} style={{ marginLeft: '0.5rem' }}>
              Prekini
            </button>
          )}

          {error && (
            <div style={{ color: 'red', marginTop: '0.5rem' }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
