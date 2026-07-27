import { createSignal, For } from 'solid-js';
export function App() {
  const n = globalThis.__N__ ?? 1000;
  const rows = Array.from({ length: n }, (_, i) => i);
  return (
    <ul class="list">
      <For each={rows}>{(i) => {
        const [c, setC] = createSignal(0);
        return (
          <li class="row" data-id={i}>
            <span class="row__label">Item {i}</span>
            <button class="row__btn" data-b={i} onClick={() => setC(c() + 1)}>{c()}</button>
          </li>
        );
      }}</For>
    </ul>
  );
}
