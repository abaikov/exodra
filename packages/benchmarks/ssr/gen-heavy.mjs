// Generate Qwik's BEST-CASE app for all three frameworks: M widgets, each with a
// UNIQUE, heavy click handler (a distinct inlined data table + computation) so
// the total interactive JS is large and cannot be deduped. The measured click
// touches ONE widget. This is where resumability should win: a hydration
// framework must ship + parse + wire ALL M handlers up front; Qwik ships ~nothing
// and lazy-loads only the clicked widget's chunk.
import { writeFileSync } from 'fs';

const M = +(process.env.M || 48);
const K = +(process.env.K || 1600);

// deterministic unique table per widget
function table(seed) {
    let x = seed * 2654435761 >>> 0;
    const a = new Array(K);
    for (let i = 0; i < K; i++) { x = (x * 1103515245 + 12345) >>> 0; a[i] = x % 1000; }
    return a;
}
// A handler body that USES its unique table so it can't be tree-shaken away, and
// returns a non-zero number (so the click visibly changes the button text).
const body = (i) => {
    const T = JSON.stringify(table(i));
    return `{const T=${T};let s=0;for(let k=0;k<T.length;k++)s=(s+T[k]*${i + 1})>>>0;return (s%97)+1;}`;
};

// ---- Exodra (raw h) --------------------------------------------------------
let exo = `import { h } from '@exodra/core';\nimport { bindable } from '@exodra/reactivity';\nexport const M=${M};\n`;
for (let i = 0; i < M; i++) exo += `function w${i}()${body(i)}\n`;
exo += `export function makeApp(){\n const rows=new Array(M);\n const W=[${Array.from({length:M},(_,i)=>'w'+i).join(',')}];\n for(let i=0;i<M;i++){const count=bindable(0);rows[i]=h('li',{static:{class:'row','data-id':String(i),children:[h('span',{static:{class:'row__label',children:'Widget '+i}}),h('button',{static:{class:'row__btn','data-b':String(i)},bindables:{textContent:count},handlers:{onClick:(function(fn){return ()=>count.setValue(fn());})(W[i])}})]}});}\n return h('ul',{static:{class:'list',children:rows}});\n}\n`;
writeFileSync('ssr/apps/exodra/app-heavy.mjs', exo);

// ---- Solid -----------------------------------------------------------------
let solid = `import { createSignal, For } from 'solid-js';\nexport const M=${M};\n`;
for (let i = 0; i < M; i++) solid += `function w${i}()${body(i)}\n`;
solid += `const W=[${Array.from({length:M},(_,i)=>'w'+i).join(',')}];\nexport function App(){\n const rows=Array.from({length:M},(_,i)=>i);\n return (<ul class="list"><For each={rows}>{(i)=>{const [c,setC]=createSignal(0);return (<li class="row" data-id={i}><span class="row__label">Widget {i}</span><button class="row__btn" data-b={i} onClick={()=>setC(W[i]())}>{c()}</button></li>);}}</For></ul>);\n}\n`;
writeFileSync('ssr/apps/solid/App-heavy.jsx', solid);

// ---- Qwik (inline onClick$ so each is its own lazy QRL chunk) --------------
let qwik = `import { component$, useSignal } from '@builder.io/qwik';\nexport const M=${M};\n`;
// Each widget is its OWN component with the heavy handler inlined in onClick$ so
// the Qwik optimizer emits one lazy chunk per widget.
for (let i = 0; i < M; i++) {
    qwik += `const W${i}=component$(()=>{const c=useSignal(0);return (<li class="row" data-id={${i}}><span class="row__label">Widget ${i}</span><button class="row__btn" data-b={${i}} onClick$={()=>{c.value=(()=>${body(i)})();}}>{c.value}</button></li>);});\n`;
}
qwik += `export const App=component$(()=>{return <ul class="list">${Array.from({length:M},(_,i)=>`<W${i} key={${i}}/>`).join('')}</ul>;});\n`;
writeFileSync('ssr/apps/qwik/app-heavy.jsx', qwik);

console.log(`generated heavy apps: M=${M} widgets, K=${K} nums/handler`);
