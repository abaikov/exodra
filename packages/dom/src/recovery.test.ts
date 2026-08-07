// @vitest-environment jsdom
//
// Does a failure on the UPDATE path stay local and heal itself? A fine-grained
// renderer has no subtree re-render, so the claim is that a throw costs one write
// and the next notification succeeds. This measures whether that holds — and
// whether an op that throws mid-flight leaves the DOM and the list out of sync.
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'fs';
import { h } from '@exodra/core';
import { bindable, list } from '@exodra/reactivity';
import { mount } from './mount';

describe('failure recovery on the UPDATE path', () => {
    it('a throwing binding does not poison later updates', () => {
        const out: string[] = [];
        let bad = false;
        const src = bindable('ok');
        const guarded = {
            getValue: () => {
                if (bad) throw new Error('boom');
                return src.getValue();
            },
            onChange: (cb: () => void) => src.onChange(cb),
        };
        const c = document.createElement('div');
        mount(h('span', { bindables: { textContent: guarded } }), c);
        expect(c.textContent).toBe('ok');

        bad = true;
        let threw = false;
        try {
            src.setValue('x');
        } catch {
            threw = true;
        }
        out.push(`throw escaped to caller: ${threw}`);
        out.push(`dom after failed update: ${JSON.stringify(c.textContent)}`);

        bad = false;
        src.setValue('recovered');
        out.push(`self-healed: ${c.textContent === 'recovered'}`);
        out.push(`dom after next update: ${JSON.stringify(c.textContent)}`);
        writeFileSync('/tmp/recovery-a.txt', out.join('\n'));
    });

    // KNOWN BUG, pinned. `push` mutates `items` and THEN notifies, so when the
    // renderer fails to build the row the item stays in the list while the DOM
    // never got it. The two silently diverge and every later index-based op
    // targets the wrong row — worse than a crash, because nothing reports it.
    // Flip `it.fails` to `it` when list ops become atomic.
    it.fails('a throwing NEW list row leaves the list and the DOM consistent', () => {
        const out: string[] = [];
        const Bad = () => {
            throw new Error('row boom');
        };
        const items = list([h('li', { static: { textContent: 'a' } })]);
        const c = document.createElement('div');
        mount(h('ul', { bindableLists: { children: items } }), c);
        const ul = c.querySelector('ul')!;

        let threw = false;
        try {
            items.push(h(Bad, {}) as never);
        } catch {
            threw = true;
        }
        const domRows = ul.children.length;
        const listLen = items.getValue().length;
        out.push(`throw escaped: ${threw}`);
        out.push(`dom rows: ${domRows} | list length: ${listLen}`);
        out.push(`CONSISTENT: ${domRows === listLen}`);

        let recovered = false;
        try {
            items.push(h('li', { static: { textContent: 'c' } }));
            recovered = true;
        } catch {
            /* swallowed on purpose — we are measuring, not asserting */
        }
        out.push(`later op works: ${recovered}`);
        out.push(`dom: ${JSON.stringify(ul.innerHTML)}`);
        writeFileSync('/tmp/recovery-b.txt', out.join('\n'));

        // The invariant every index-based op depends on.
        expect(domRows).toBe(listLen);
    });
});
