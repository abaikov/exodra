import { component$, useSignal } from '@builder.io/qwik';
const L='Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation';
const Carousel=component$(({j})=>{const s=useSignal(0);return (<div class="carousel" data-id={j}><span class="car__label">Carousel {j} slide </span><button class="car__next" data-b={j} onClick$={()=>s.value++}>{s.value}</button></div>);});
export const App=component$(()=>{const secs=Array.from({length:50},(_,i)=>i);return (<div class="landing">{secs.map(i=><section class="sec" key={i}><h2>Section {i}</h2><p>{L+' '+i}</p></section>)}{[0,1,2].map(j=><Carousel j={j} key={j}/>)}</div>);});
