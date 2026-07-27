import { createSignal, For } from 'solid-js';
const L='Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation';
export function App(){
  const secs=Array.from({length:50},(_,i)=>i); const cars=[0,1,2];
  return (<div class="landing">
    <For each={secs}>{(i)=><section class="sec"><h2>Section {i}</h2><p>{L+' '+i}</p></section>}</For>
    <For each={cars}>{(j)=>{const [s,setS]=createSignal(0);return (<div class="carousel" data-id={j}><span class="car__label">Carousel {j} slide </span><button class="car__next" data-b={j} onClick={()=>setS(s()+1)}>{s()}</button></div>);}}</For>
  </div>);
}
