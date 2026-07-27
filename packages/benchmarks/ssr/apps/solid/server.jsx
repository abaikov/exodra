import { renderToString, generateHydrationScript } from 'solid-js/web';
import { App } from './App.jsx';
export function render() {
  const t0 = performance.now();
  const body = renderToString(() => <App />);
  const ms = performance.now() - t0;
  return { body, ms, head: generateHydrationScript() };
}
