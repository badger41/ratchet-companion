import '@cloudscape-design/global-styles/index.css';
import { applyMode, Mode } from '@cloudscape-design/global-styles';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

applyMode(Mode.Dark);

createRoot(document.getElementById('root')!).render(<App />);
