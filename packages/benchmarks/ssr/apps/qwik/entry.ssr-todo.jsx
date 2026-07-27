import { renderToString } from '@builder.io/qwik/server';
import { App } from './todo';
export default function render(opts){ return renderToString(<App/>, { containerTagName:'div', ...opts }); }
