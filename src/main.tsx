import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { queryClient } from './lib/queryClient'
import { generateAvailability } from './lib/availability';

// --- VERIFICACIÓN TEMPORAL ---
const testConfig = {
  workingDays: [1, 2, 3, 4, 5], // Lunes a Viernes
  holidays: [{ date: '2025-12-25', reason: 'Navidad' }]
};
console.log('--- TEST AVAILABILITY ---');
console.table(generateAvailability(testConfig));
// -----------------------------


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
