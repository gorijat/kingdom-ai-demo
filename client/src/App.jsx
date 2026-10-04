import { useState, useEffect, useRef } from 'react';
import './App.css';
import ReactMarkdown from 'react-markdown';

//Cuva sesiju i token za autentifikaciju korisnika, kao i poruke iz chat-a. Takodje omogucava login i logout korisnika.
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

  //Za login Auth i autorization

  const [token, setToken] = useState(() => ucitajSesiju().token || null);
  const [korisnickoIme, setKorisnickoIme] = useState('');
  const [lozinka, setLozinka] = useState('');
  const [imeKorisnika, setImeKorisnika] = useState(() => ucitajSesiju().ime || '');
  const [ulogaKorisnika, setUlogaKorisnika] = useState(() => ucitajSesiju().uloga || '');
  const [loginGreska, setLoginGreska] = useState('');

  //END login 

  //ovaj kod je radi bolje citljivosti da se prikaziuje stranica pravilno

  const messagesEndRef = useRef(null);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);

  //END kod za bolju citljivost

  const sendMessage = async () => {
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);

    const newController = new AbortController(); //Object za prekidanje requesta
    setController(newController);

    try { //try-catch blok za slanje poruke na backend server da uhvati gresku
    const response = await fetch('http://localhost:5000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
        'x-api-token': token }, //dodavanje tokena u header za autentifikaciju
      body: JSON.stringify({ messages: newMessages }),
      signal: newController.signal,
    });

    if (!response.ok) {
      throw new Error('Server je vratio gresku');
    }

    const data = await response.json();
    setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
  } catch (err) {
    if (err.name === 'AbortError') {
      setError('Generisanje je prekinuto.');
    } else {
      setError('Došlo je do greške prilikom komunikacije sa serverom.');
    }
    
  } finally {
    setLoading(false);
    setController(null);
  }
  };

  //Function za login korisnika

  const prijaviSe = async () => {
    setLoginGreska('');
  
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

  const stopGeneration = () => {
    if (controller) {
      controller.abort();
    }
  }

  //END login korisnika

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
                  <div className="chat-message">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
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