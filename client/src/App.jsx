import { useState } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  
  const sendMessage = async () => {
    setLoading(true);
    setReply('');

    const response = await fetch('http://localhost:5000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    const text = await response.text();
    setReply(text);
    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Kingdom AI Assistant</h1>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Postavi pitanje..."
        style={{ width: '80%', padding: '0.5rem' }}
      />
      <button onClick={sendMessage} disabled={loading}>
        {loading ? 'Šaljem...' : 'Pošalji'}
      </button>

      <div style={{ marginTop: '1rem' }}>
        {reply}
      </div>
    </div>
  );
}

export default App;