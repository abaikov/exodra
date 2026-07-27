import { renderToString, generateHydrationScript } from 'solid-js/web';
import { App } from './Todo.jsx';
export function render(){const t=performance.now();const body=renderToString(()=><App/>);return {body,ms:performance.now()-t,head:generateHydrationScript()};}
