// @vitest-environment jsdom
//
// Static text right after a children port. The DOM compiler anchors the region on that Text node, and
// where the server's parser would merge the run into the text before the region or eat its leading
// newline, both markup compilers put an empty comment in front of it. Empty and filled regions are
// asked separately because the merge only happens when no row stands between the two runs.
import type {
    TExoSchemaCursor,
    TExoChildrenPort,
    TExoChildrenWiring,
    TExoMachineInitialState,
    TExoTextPort,
} from '@exodra/core';
import { describe, it } from 'vitest';
import { assertExoConformanceRule, renders } from '../../index';
import { createExoTestMachine } from '@exodra/test-utils';

const ROW = createExoTestMachine(
    (b: TExoSchemaCursor) => {
        let label!: TExoTextPort;
        b.el('b', null, (el) => {
            label = el.textPort();
        });
        return { label };
    },
    (P) =>
        (c: TExoChildrenWiring, params: unknown): void => {
            c.text(P.label, String(params));
        }
);

const regionBetween = (tag: string, head: string, tail: string, rows: readonly string[]) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let region!: TExoChildrenPort;
            b.el(tag, null, (el) => {
                if (head !== '') el.text(head);
                region = el.childrenPort();
                el.text(tail);
            });
            return { region };
        },
        (P): TExoMachineInitialState<TExoChildrenWiring> =>
            (c) => {
                c.list(P.region, ROW, rows);
            }
    );

const CASES: readonly (readonly [string, string, string, string, readonly string[]])[] = [
    ['rows, then text', 'p', '', 'tail', ['x', 'y']],
    ['no rows, then text', 'p', '', 'tail', []],
    ['text, rows, text', 'p', 'head', 'tail', ['x', 'y']],
    ['text, no rows, text', 'p', 'head', 'tail', []],
    ['no rows in a <pre>, then a newline', 'pre', '', '\ntail', []],
    ['rows in a <pre>, then a newline', 'pre', '', '\ntail', ['x']],
];

describe('static text after a children port', () => {
    for (const [name, tag, head, tail, rows] of CASES) {
        it(`renders the rows before the text on every backend: ${name}`, () => {
            assertExoConformanceRule({
                name: `<${tag}>${head}{region}${JSON.stringify(tail)}</${tag}>, ${name}`,
                subject: () => ({ component: regionBetween(tag, head, tail, rows) }),
                expect: {
                    dom: renders(),
                    string: renders(),
                    term: renders(),
                    hydrate: renders(),
                },
                agreement: [['dom', 'hydrate', 'string', 'term']],
            });
        });
    }
});
