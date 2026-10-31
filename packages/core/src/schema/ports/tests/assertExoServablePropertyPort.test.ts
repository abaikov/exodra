import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createExoSchema } from '../../factories/createExoSchema';
import { withExoSchemaAsserts } from '../../cursor/withExoSchemaAsserts';

/**
 * WHAT THIS FILE PINS: that three refusals in `@exodra/core` SHIP — that they are not deleted
 * from the bundle a user downloads — and that the source shape which makes that true cannot
 * change without a test failing.
 *
 * The three are `check-misplaced-property-port` (a `value` port on a `<select>` or an
 * `<output>`), `assertExoNoTextAfterChildrenPort` (static text after a children port) and `createExoStatic`
 * (a static component whose cursor declared ports). Written
 * `if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production' && COND) throw`,
 * a refusal in this repository does not merely lose its MESSAGE: the `define` folds `NODE_ENV`
 * to "production" and the minifier deletes the WHOLE condition, `COND` with it. A production
 * build would then run no check at all and accept, in silence, a page that renders and means
 * something else — the served `<select>` on its first option while the client shows the second,
 * region rows on the wrong side of a label, an attribute stuck empty for the life of the page.
 *
 * So each uses the second shape from the two-baskets note in `createExoSchema.ts`:
 * `throw new Error(guard ? what + ' — how to fix it' : what)`. `false ? long : short` folds to
 * `short`, so the explanation leaves the bundle while the comparison, the throw and the `never`
 * return type stay.
 *
 * The value assertions below show the BEHAVIOUR. The last `it` is what fails if the shape changes
 * back, because the runtime cannot observe a minifier — see its own comment.
 */

/**
 * WHAT THIS SIMULATES, AND WHAT IT DOES NOT. Under vitest `NODE_ENV` is `test`, so every guard is
 * live and reads the development message. Setting the variable to `production` around a call makes
 * the guard evaluate to `false`, which is the value a bundler's `define` folds it to — so this
 * observes exactly what a production build's REMAINING code does. What it cannot observe is the
 * minifier's deletion pass; that is a property of the SOURCE SHAPE, asserted at the end of this
 * file. The precedent for the technique is `@exodra/dom`'s `exo-events.test.ts`.
 */
function underProduction<T>(fn: () => T): T {
    const before = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
        return fn();
    } finally {
        if (before === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = before;
    }
}

const selectValuePort = (): unknown =>
    createExoSchema((b) => {
        b.el('select', null, (s) => {
            s.port('value');
        });
        return {};
    }, withExoSchemaAsserts);

const outputValuePort = (): unknown =>
    createExoSchema((b) => {
        b.el('output', null, (o) => {
            o.port('value');
        });
        return {};
    }, withExoSchemaAsserts);

describe('the misplaced-property-port refusal is NOT dev-only — it ships', () => {
    it('refuses `value` on a <select> under NODE_ENV=production', () => {
        expect(() => underProduction(selectValuePort)).toThrow('EXO0015');
    });

    it('refuses `value` on an <output> under NODE_ENV=production', () => {
        expect(() => underProduction(outputValuePort)).toThrow('EXO0015');
    });

    it('refuses a name that arrived as DATA — the case a stripped build could not see', () => {
        // THE REASON THIS ONE IS NOT STRIPPABLE, written as the program that produces it.
        // `ExoSchemaCursor.port()` takes an ordinary `string`, so a schema built from a form
        // description, a CMS column list or a plugin registry names its ports from data the
        // developer's machine never had. Nobody typed `'value'` anywhere in this schema.
        const fields = [
            { tag: 'input', attr: 'placeholder' },
            { tag: 'select', attr: 'value' },
        ];
        expect(() =>
            underProduction(() =>
                createExoSchema((b) => {
                    b.el('form', null, (f) => {
                        for (const field of fields) {
                            f.el(field.tag, null, (e) => {
                                e.port(field.attr);
                            });
                        }
                    });
                    return {};
                }, withExoSchemaAsserts)
            )
        ).toThrow('EXO0015');
    });

    it('carries the bare code in production and the whole sentence in dev', () => {
        // The second shape's whole trade. The code is bare, so the call, the port name and the
        // element are development's; what a production console carries is which refusal fired.
        let short = '';
        underProduction(() => {
            try {
                selectValuePort();
            } catch (e) {
                short = (e as Error).message;
            }
        });
        let long = '';
        try {
            selectValuePort();
        } catch (e) {
            long = (e as Error).message;
        }

        expect(short).toBe('EXO0015');
        expect(long).toContain(
            'ExoSchemaCursor.port(): port("value") on <select> cannot be SERVED'
        );
        expect(long).toContain('writeExoChoice');
        expect(long).toContain("port('selected')");
        expect(long).not.toContain('EXO0015');
        expect(long.length).toBeGreaterThan(short.length);
    });

    it('is the same bare code for the <output> case, whose sentence differs in dev', () => {
        let short = '';
        underProduction(() => {
            try {
                outputValuePort();
            } catch (e) {
                short = (e as Error).message;
            }
        });
        let long = '';
        try {
            outputValuePort();
        } catch (e) {
            long = (e as Error).message;
        }

        expect(short).toBe('EXO0015');
        expect(long).toContain(
            'ExoSchemaCursor.port(): port("value") on <output> cannot be SERVED'
        );
        expect(long).toContain('textPort()');
        expect(long).not.toContain('bindExoOption');
    });

    it('does NOT widen the rule under production — textarea, input and option still build', () => {
        // The other half of the change: what ships is a REFUSAL, not a scare. `value` on a
        // `<textarea>` is a named OPEN gap rather than a refusal (its only other spelling is the
        // element's DEFAULT value), `indeterminate` has no markup form anywhere, and on every tag
        // the table does not name `value` is an ordinary attribute both backends write alike.
        const schema = underProduction(() =>
            createExoSchema((b) => {
                const out: Record<string, { index: number }> = {};
                b.el('div', null, (d) => {
                    d.el('textarea', null, (t) => {
                        out.text = t.port('value');
                    });
                    d.el('input', { type: 'checkbox' }, (i) => {
                        out.mixed = i.port('indeterminate');
                    });
                    d.el('option', null, (o) => {
                        out.option = o.port('value');
                    });
                });
                return out;
            }, withExoSchemaAsserts)
        );
        expect(schema.portList).toHaveLength(3);
    });
});

describe('the three core refusals are a SOURCE-SHAPE property', () => {
    /**
     * Every `process.env.NODE_ENV` read in a file, found by TypeScript's own parser rather than by
     * a text scan — these files are mostly prose, the word "process" appears in dozens of comments,
     * and the runtime source contains quotes inside string literals that defeat a naive scanner.
     */
    function nodeEnvReads(file: string): ts.Node[] {
        const src = readFileSync(fileURLToPath(new URL('../' + file, import.meta.url)), 'utf8');
        // `true` sets parent pointers, which is what makes "what is this expression an operand
        // of?" answerable.
        const source = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
        const reads: ts.Node[] = [];
        const visit = (node: ts.Node): void => {
            if (
                ts.isPropertyAccessExpression(node) &&
                node.name.text === 'NODE_ENV' &&
                ts.isPropertyAccessExpression(node.expression) &&
                node.expression.name.text === 'env'
            ) {
                reads.push(node);
            }
            ts.forEachChild(node, visit);
        };
        ts.forEachChild(source, visit);
        return reads;
    }

    it('neither throw sits inside the stripped condition', () => {
        // The runtime assertions above cannot see the minifier, and the minifier is what deletes a
        // check written `if (guard && COND) throw`. So the shape itself is asserted: in each file
        // every `process.env.NODE_ENV` read must be the test of a CONDITIONAL EXPRESSION — the
        // `guard ? long : short` that folds to `short` — and never the left half of an `if` that
        // carries the refusal away with it. This is the assertion that fails if any of the three
        // goes back to the cheaper shape, and it is text, so it is checkable.
        //
        // `browserGlobalSafety.test.ts` asserts the other half of the spelling — that the
        // `typeof` stands immediately in front — across all three runtime packages.
        //
        // ONE of `compileExoStrSchema.ts`'s four guards in @exodra/string carries this shape and
        // is asserted in its own test file. The other three there are deliberately still
        // `if (guard && COND)`: they compare this repository's own two walks against each other,
        // which is a fact no user's machine can add to.
        for (const file of [
            'asserts/assertExoServablePropertyPort.ts',
            '../markup/asserts/assertExoNoTextAfterChildrenPort.ts',
            '../../machine/factories/createExoStatic.ts',
        ]) {
            const reads = nodeEnvReads(file);
            expect(reads.length, `${file} reads process.env.NODE_ENV`).toBe(1);
            for (const read of reads) {
                // Walk out of the `!==` and the `&&` to whatever the whole guard is an operand of.
                let node: ts.Node = read;
                while (
                    ts.isBinaryExpression(node.parent) ||
                    ts.isParenthesizedExpression(node.parent)
                ) {
                    node = node.parent;
                }
                expect(
                    ts.isConditionalExpression(node.parent) && node.parent.condition === node,
                    `${file}: the NODE_ENV guard must be the test of a \`? :\` that folds to the ` +
                        'short message, not an `if` that takes the refusal away with it'
                ).toBe(true);
            }
        }
    });
});
