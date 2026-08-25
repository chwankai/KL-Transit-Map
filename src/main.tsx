import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initGA } from './lib/analytics'
import { initOfflineSimulator } from './lib/offlineSimulator'
import { initLocationSimulator } from './lib/locationSimulator'

// Initialize Google Analytics if configured
initGA();

// Initialize offline simulator if enabled
initOfflineSimulator();

// Initialize location simulator if enabled
initLocationSimulator();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
