import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import 'leaflet/dist/leaflet.css';
import './index.css';
import { applyBrand } from '@/config/brand';
import { startSimulation } from '@/sim/simulation';
import { App } from './App';

applyBrand();
startSimulation();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      closeButton
      toastOptions={{
        style: { fontFamily: 'Inter, sans-serif', fontSize: 12, borderRadius: 6 },
      }}
    />
  </StrictMode>,
);
