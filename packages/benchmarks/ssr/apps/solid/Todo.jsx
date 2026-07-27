import { createSignal, For } from 'solid-js';
const TAGS=['ui','api','bug','perf','docs']; const AUTHORS=['Ada','Lin','Rex','Mia','Sol'];
export function App(){
  const cards=Array.from({length:globalThis.__N__??200},(_,i)=>i);
  return (<div class="todo"><For each={cards}>{(i)=>{const [c,setC]=createSignal(0);return (
    <article class="card" data-id={i}>
      <h3 class="card__title">Task {i}</h3>
      <div class="card__tags"><For each={[0,1,2]}>{(k)=><span class="tag">{TAGS[(i+k)%5]}</span>}</For></div>
      <button class="card__btn" data-b={i} onClick={()=>setC(c()+1)}>{c()}</button>
      <ul class="card__comments"><For each={[0,1,2]}>{(k)=><li class="cmt"><b class="author">{AUTHORS[(i+k)%5]}</b><span class="body">note {k} on task {i}</span></li>}</For></ul>
    </article>);}}</For></div>);
}
