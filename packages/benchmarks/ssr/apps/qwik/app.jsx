import { component$, useSignal } from '@builder.io/qwik';
export const Row = component$(({ i }) => {
  const c = useSignal(0);
  return (
    <li class="row" data-id={i}>
      <span class="row__label">Item {i}</span>
      <button class="row__btn" data-b={i} onClick$={() => c.value++}>{c.value}</button>
    </li>
  );
});
export const App = component$(() => {
  const n = globalThis.__N__ ?? 1000;
  const rows = Array.from({ length: n }, (_, i) => i);
  return <ul class="list">{rows.map((i) => <Row i={i} key={i} />)}</ul>;
});
