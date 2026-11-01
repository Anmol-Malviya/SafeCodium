import React from 'react';
import ReactDOM from 'react-dom/client';
import { loader } from '@monaco-editor/react';
import App from './App';
import './index.css';

// Configure @monaco-editor/react to load its AMD bundle & workers directly from
// our local origin (/monaco-vs) instead of external CDN (jsdelivr).
// This completely resolves tracking prevention blocks and worker bundling errors.
loader.config({
  paths: {
    vs: '/monaco-vs',
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
