import React, { useState } from 'react';
import './App.css';

function App() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResponse(null);
    try {
      const res = await fetch('http://localhost:3001/bfhl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: input.split(/\r?\n|,|;/).map(s => s.trim()).filter(Boolean) })
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError('Failed to fetch API response.');
    }
  };

  return (
    <div className="container">
      <h1>SRM BFHL Challenge</h1>
      <form onSubmit={handleSubmit}>
        <textarea
          rows={6}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Enter node edges, e.g. A->B, B->C"
        />
        <button type="submit">Submit</button>
      </form>
      {error && <div className="error">{error}</div>}
      {response && (
        <pre className="response">{JSON.stringify(response, null, 2)}</pre>
      )}
    </div>
  );
}

export default App;
