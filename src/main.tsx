import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx' // Asegúrate que importe App
import './index.css'
import { generateAvailability } from './lib/availability';

// --- VERIFICACIÓN TEMPORAL ---
const testConfig = {
  workingDays: [1, 2, 3, 4, 5], // Lunes a Viernes
  holidays: [{ date: '2025-12-25', reason: 'Navidad' }] // Ajustar fecha si es necesario para ver efecto
};
console.log('--- TEST AVAILABILITY ---');
console.table(generateAvailability(testConfig));
// -----------------------------


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)