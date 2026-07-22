import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AccessibilityProvider } from '@/contexts/AccessibilityContext'
import App from './App.tsx'
import './index.css'
import { Toaster } from "@/components/ui/sonner"

// Unregister any lingering service workers from previous PWA setups
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <BrowserRouter>
      <AccessibilityProvider>
        <App />
        <Toaster />
      </AccessibilityProvider>
    </BrowserRouter>
  </HelmetProvider>
);
