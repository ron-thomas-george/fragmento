import { useEffect, useState } from 'react';

export function App() {
  const [status, setStatus] = useState('Ready');

  useEffect(() => {
    window.onmessage = (event) => {
      const msg = event.data.pluginMessage;
      if (msg?.type === 'pong') {
        setStatus('Connected to Fragmento plugin controller');
      }
    };
  }, []);

  const handlePing = () => {
    parent.postMessage({ pluginMessage: { type: 'ping' } }, '*');
  };

  const handleClose = () => {
    parent.postMessage({ pluginMessage: { type: 'close' } }, '*');
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: 16 }}>
      <h1 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Fragmento</h1>
      <p style={{ fontSize: 11, color: '#555', marginBottom: 12 }}>
        Design token management for shadcn/ui – Figma plugin skeleton.
      </p>
      <div style={{ fontSize: 11, marginBottom: 12 }}>Status: {status}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handlePing}>Ping controller</button>
        <button onClick={handleClose}>Close</button>
      </div>
    </div>
  );
}
