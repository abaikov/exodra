// It never removes anything, and must not: an `afterEach` that empties `document.body` would fail
// any case asserting on a rendered node it still holds after a later render. See README.
export const host = (): HTMLElement => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return el;
};
