import { createRoot } from 'react-dom/client';
import '../shared/app.css';
import { Provider } from './store.jsx';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<Provider><App /></Provider>);
