import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { NeonAuthUIProvider } from '@neondatabase/neon-js/auth/react/ui';
import App from './App';
import { authClient } from './lib/auth';
import './index.css';
import '@neondatabase/auth/ui/css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <NeonAuthUIProvider authClient={authClient} redirectTo="/">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </NeonAuthUIProvider>
  </React.StrictMode>
);
