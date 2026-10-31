// @vitest-environment jsdom
//
// Two questions, splitting on whether the port OWNS its element or SHARES it. Every refusal is
// expected at `EXO_STAGE_WIRE` and none at schema compile: a children port is not CONTENT — only
// `textPort()` writes `content` — so it compiles into an ordinary region answered by the SETTER
// TABLE when the fill door runs.
import type {
    TExoSchemaCursor,
    TExoChildrenPort,
    TExoChildrenWiring,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, it } from 'vitest';
import { EXO_STAGE_WIRE, assertExoConformanceRule, refusesAt, renders } from '../../index';
import { createExoTestMachine } from '@exodra/test-utils';

const MARKUP = '<b>bold</b>';

const soleChild = () =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let html!: TExoChildrenPort;
            b.el('div', null, (d) => {
                html = d.childrenPort();
            });
            return { html };
        },
        (P): TExoMachineInitialState<TExoChildrenWiring> =>
            (c) => {
                c.unsafeHtml(P.html, MARKUP);
            }
    );

const sharedWithASibling = () =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let html!: TExoChildrenPort;
            b.el('div', null, (d) => {
                d.el('span', null, (s) => {
                    s.text('kept');
                });
                html = d.childrenPort();
            });
            return { html };
        },
        (P): TExoMachineInitialState<TExoChildrenWiring> =>
            (c) => {
                c.unsafeHtml(P.html, MARKUP);
            }
    );

describe('raw markup into a children port', () => {
    it('THE PORT OWNS ITS ELEMENT — two backends render it, two refuse it, one silences it', () => {
        assertExoConformanceRule({
            name: 'html(port, markup) where the children port is its element’s only child',
            subject: () => ({ component: soleChild() }),
            expect: {
                // `innerHTML`, installed only for a port that is its element's sole child.
                dom: renders(),
                string: renders(),
                term: refusesAt(EXO_STAGE_WIRE, /CHILDREN port/),
                // SILENCED, not refused: the server printed the markup and the browser parsed it,
                // so rewriting would tear down a correct subtree and its fresh listeners.
                hydrate: renders(),
            },
            // A split here means a hydrated page has stopped matching the markup it hydrated from.
            agreement: [['dom', 'string', 'hydrate']],
        });
    });

    it('THE PORT SHARES ITS ELEMENT — all four refuse, and one of them for somebody else’s reason', () => {
        assertExoConformanceRule({
            name: 'html(port, markup) where the children port stands among static siblings',
            subject: () => ({ component: sharedWithASibling() }),
            expect: {
                // `innerHTML` replaces EVERYTHING inside the element; the `<span>` is what it would
                // delete.
                dom: refusesAt(EXO_STAGE_WIRE, /children port/),
                // The server could print this trivially, producing a component that rendered
                // perfectly and threw the moment a browser touched it.
                string: refusesAt(EXO_STAGE_WIRE, /children port/),
                term: refusesAt(EXO_STAGE_WIRE, /CHILDREN port/),
                // A silent no-op turns a loud client-render failure into a page that hydrates onto
                // the server's markup and quietly means something else.
                hydrate: refusesAt(EXO_STAGE_WIRE, /children port/),
            },
            // Nothing rendered, so nothing to partition: four expectations name the same layer.
            agreement: [],
        });
    });
});
