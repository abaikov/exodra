import { hydrate } from '@exodra/dom';
import { App } from './app';

const root = document.getElementById('app');
if (root) {
    hydrate(App(), root);
}
