import { renderToString } from '@builder.io/qwik/server'; import { App } from './land';
export default function render(opts){ return renderToString(<App/>, { containerTagName:'div', ...opts }); }
