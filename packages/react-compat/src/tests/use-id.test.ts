// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, createElement as h, createRoot, useId, useState } from '../index';
import { hydrateRoot } from '../client';
import { renderToString } from '../server';

function Field({ label }: { label: string }) {
    const id = useId();
    return h('p', null, h('label', { htmlFor: id }, label), h('input', { id }));
}

function Form() {
    const [, setTick] = useState(0);
    return h(
        'form',
        { onSubmit: () => setTick((n) => n + 1) },
        h(Field, { label: 'Name' }),
        h(Field, { label: 'Email' })
    );
}

const idsIn = (root: ParentNode): string[] =>
    Array.from(root.querySelectorAll('input')).map((input) => input.id);

describe('useId', () => {
    it('the server and the client count the same ids, render after render', () => {
        const first = renderToString(h(Form, null));
        const second = renderToString(h(Form, null));
        expect(second).toBe(first);

        const host = document.createElement('div');
        host.innerHTML = first;
        const served = idsIn(host);
        act(() => {
            hydrateRoot(host, h(Form, null));
        });
        expect(idsIn(host)).toEqual(served);
        expect(new Set(served).size).toBe(2);
        expect(host.querySelector('label')?.htmlFor).toBe(served[0]);
    });

    it('an id stays the same across re-renders of its component', () => {
        const host = document.createElement('div');
        document.body.appendChild(host);
        act(() => createRoot(host).render(h(Form, null)));
        const before = idsIn(host);
        act(() => {
            host.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true }));
        });
        expect(idsIn(host)).toEqual(before);
    });

    it('identifierPrefix keeps two roots on one page apart', () => {
        const a = document.createElement('div');
        const b = document.createElement('div');
        act(() => {
            createRoot(a, { identifierPrefix: 'a' }).render(h(Field, { label: 'x' }));
            createRoot(b, { identifierPrefix: 'b' }).render(h(Field, { label: 'x' }));
        });
        expect(idsIn(a)[0]).not.toBe(idsIn(b)[0]);
        expect(renderToString(h(Field, { label: 'x' }), { identifierPrefix: 'a' })).toContain(
            `id="${idsIn(a)[0]}"`
        );
    });
});
