import { useState } from 'react';
import './App.css';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const response = await fetch('http://localhost:5000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages }),
    });

    const text = await response.text();
    setMessages([...newMessages, { role: 'assistant', content: text }]);
    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Kingdom AI Assistant</h1>

      <div style={{ border: '1px solid #ccc', padding: '1rem', minHeight: '300px', marginBottom: '1rem' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '0.5rem' }}>
            <strong>{msg.role === 'user' ? 'Ti: ' : 'AI: '}</strong>
            {msg.content}
          </div>
        ))}
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
    </div>
  );
}

export default App;