import { hydrate } from '@exodra/dom'; import { makeApp } from './land.mjs';
hydrate(makeApp(), document.getElementById('app').firstElementChild);
