import { hydrate } from '@exodra/dom';
import { makeApp } from './todo.mjs';
const t=performance.now(); hydrate(makeApp(), document.getElementById('app').firstElementChild); window.__HYDMS__=performance.now()-t;
