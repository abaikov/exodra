import { hydrate } from 'solid-js/web';
import { App } from './App-heavy.jsx';
const t = performance.now(); hydrate(() => <App />, document.getElementById('app')); window.__HYDMS__ = performance.now() - t;
