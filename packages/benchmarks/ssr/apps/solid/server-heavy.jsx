import { renderToString, generateHydrationScript } from 'solid-js/web';
import { App } from './App-heavy.jsx';
export function render() { const t0 = performance.now(); const body = renderToString(() => <App />); return { body, ms: performance.now() - t0, head: generateHydrationScript() }; }
