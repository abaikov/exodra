import { hydrate } from '@exodra/dom';
import { makeApp } from './app-heavy.mjs';
const root = document.getElementById('app').firstElementChild;
const t = performance.now(); hydrate(makeApp(), root); window.__HYDMS__ = performance.now() - t;
