import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, { once: true });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#20309A',
              color: '#FFFFFF',
              borderRadius: '10px',
              fontSize: '13px',
              border: '1px solid rgba(255, 255, 255, 0.20)',
              boxShadow: '0 8px 30px rgba(10, 16, 50, 0.25)',
            },
            success: { iconTheme: { primary: '#15803D', secondary: '#FFFFFF' } },
            error: { iconTheme: { primary: '#BB232B', secondary: '#FFFFFF' } },
          }}
        />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
