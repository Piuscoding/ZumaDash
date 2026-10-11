import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import { I18nProvider } from './context/I18nContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider><AuthProvider>
      <BrandingProvider>
        <App />
      </BrandingProvider>
    </AuthProvider></I18nProvider>
  </React.StrictMode>
);
