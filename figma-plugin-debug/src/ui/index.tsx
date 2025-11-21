import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

console.log('UI script loaded');

const container = document.getElementById('react-page');
if (container) {
  console.log('Container found, creating React root');
  try {
    const root = createRoot(container);
    root.render(<App />);
    console.log('React app rendered');
  } catch (error) {
    console.error('Error rendering React app:', error);
    // Fallback UI
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <h2>Fragmento Plugin</h2>
        <p>Loading...</p>
        <p style="color: #666; font-size: 12px;">If this persists, please check the console for errors.</p>
      </div>
    `;
  }
} else {
  console.error('React container not found');
}
