import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

declare global {
  interface Window {
    manticore: { platform: string };
  }
}

function App() {
  return (
    <main>
      <p className="eyebrow">Manticore 2.0</p>
      <h1>Visual Editor</h1>
      <p>The desktop shell, React UI, and development hot reload are ready.</p>
      <small>Running on {window.manticore?.platform ?? 'the web preview'}.</small>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

