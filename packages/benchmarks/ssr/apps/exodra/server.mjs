// The server half of the EXODRA participant (the schema core): render the page `client.mjs` adopts,
// with the SAME component value — so "the same wiring on both sides" is a fact about the import.
import { ExoStrBackend } from '@exodra/string';
import { LIST } from './app.mjs';

const EXO_STR = new ExoStrBackend();

/**
 * The `#app` innerHTML the shell wraps — the same shape every other participant's `renderBody()`
 * returns.
 *
 * ONE CALL, because the `<ul class="list">` is the LIST component's own markup and the rows are its
 * fixed child list. It used to be a hand-written string with a loop of row renders inside it, and
 * that was the defect: the `<ul>` belonged to nobody, so the client had nothing to adopt it with.
 *
 * No whitespace anywhere: rows are concatenated with nothing between them, which is what the DOM
 * backend produces by appending, and hydration is a comparison of exactly those bytes.
 */
export function renderBody() {
    return EXO_STR.render(LIST);
}
