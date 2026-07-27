import { component$, useSignal } from '@builder.io/qwik';
const TAGS=['ui','api','bug','perf','docs']; const AUTHORS=['Ada','Lin','Rex','Mia','Sol'];
export const Card = component$(({i}) => {
  const c = useSignal(0);
  return (
    <article class="card" data-id={i}>
      <h3 class="card__title">Task {i}</h3>
      <div class="card__tags">{[0,1,2].map(k=><span class="tag" key={k}>{TAGS[(i+k)%5]}</span>)}</div>
      <button class="card__btn" data-b={i} onClick$={()=>c.value++}>{c.value}</button>
      <ul class="card__comments">{[0,1,2].map(k=><li class="cmt" key={k}><b class="author">{AUTHORS[(i+k)%5]}</b><span class="body">note {k} on task {i}</span></li>)}</ul>
    </article>
  );
});
export const App = component$(() => {
  const cards = Array.from({length: globalThis.__N__ ?? 200}, (_,i)=>i);
  return <div class="todo">{cards.map(i=><Card i={i} key={i}/>)}</div>;
});
