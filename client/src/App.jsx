import { useState, useEffect, useRef } from 'react';
import './App.css';
import ReactMarkdown from 'react-markdown';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [controller, setController] = useState(null);

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages }),
      signal: newController.signal,
    });

    if (!response.ok) {
      throw new Error('Server je vratio gresku');
    }

    const text = await response.text();
    setMessages([...newMessages, { role: 'assistant', content: text }]);
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

  const stopGenaration = () => {
    if (controller) {
      controller.abort();
    }
  }


  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Kingdom AI Assistant</h1>

      <div style={{ border: '1px solid #ccc', padding: '1rem', minHeight: '400px', overflowY: 'auto', marginBottom: '1rem' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '0.5rem' }}>
            <strong>{msg.role === 'user' ? 'Ti: ' : 'AI: '}</strong>
            <ReactMarkdown>{msg.content}</ReactMarkdown>
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
      {loading && ( // dugme prekini se prikazuje samo dok se ceka odgovor od AI modela       
          <button onClick={stopGenaration} style={{ marginLeft: '0,5rem', backgroundColor: 'red', color: 'white' }}>
            Prekini generisanje
          </button>
        )}

      {error && (
       <div style={{ color: 'red', marginTop: '0.5rem' }}>
       {error}
       </div>
    )}

    </div>
  );
}

export default App;