import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './components';
import './styles.css';
async function start(){const [{default:App},{AuthProvider},{api},{platformRegistry,registerBrowserTools}]=await Promise.all([import('./App'),import('./auth'),import('./services'),import('@cnmechanic/webmcp')]);createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><BrowserRouter><AuthProvider><App/></AuthProvider></BrowserRouter></ErrorBoundary></StrictMode>);const controller=new AbortController();window.addEventListener('pagehide',()=>controller.abort(),{once:true});void registerBrowserTools(platformRegistry(api),document,controller.signal);}
void start().catch(()=>{createRoot(document.getElementById('root')!).render(<main className="container"><h1>CNMechanic</h1><p>The platform could not start. Please check the environment configuration or try again later.</p></main>);});
