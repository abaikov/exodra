// @vitest-environment jsdom
//
// AN EVENT PORT NAME THE RUNTIME HAS NEVER HEARD OF — accepted, and turned into a listener for
// that literal string. The runtime deliberately does NOT check an event port's name, and nothing
// anywhere constructed one, so the accepted behaviour was undocumented in the only place that
// cannot go stale.
//
// THE DECISION IS DEFENSIBLE AND ITS CONSEQUENCE IS SHARP. An event type is a different vocabulary
// from an attribute name — a custom event may be called anything a string can hold — and the name
// reaches no markup on any backend, so the check `port()` runs would refuse legal programs to
// prevent nothing. The consequence is that a MISTYPED name is legal too, and a listener bound to a
// name nothing ever dispatches is a dead handler with no error — the same silent failure the
// delegated-pack refusals prevent for the names they DO check, which is why those refusals keep
// their condition (and drop only their prose) in a production build.
//
// SO THIS FILE PINS BOTH HALVES: the custom name works, and the case-mangled name is a listener for
// the case-mangled name and not for the real event. Adding a check later then has to change these
// assertions on purpose, which is the difference between a decision and a regression.
//
// IT LIVES IN @exodra/dom RATHER THAN BESIDE THE CURSOR because "produces a listener for that
// literal name" is only observable where there is a DOM to listen with; the cursor half (accepted
// here, refused as an attribute) is asserted in the same cases so the asymmetry reads in one place.
import { withExoSchemaAsserts } from '@exodra/core';
import type {
    TExoSchemaCursor,
    TExoEventPort,
    TExoPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

/** What the wire needs of an exonode — one listener, no descriptor. */
type TNode = {
    on(port: TExoPort, handler: (event: Event) => void, subject?: unknown): void;
};

/** A name no runtime knows, and one `assertExoLegalAttrName` would refuse outright (it has a space). */
const INVENTED = 'user:signed in';

/** A row listening for `event`, recording every type it actually hears. */
const rowListeningFor = (event: string, heard: string[]) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let port!: TExoEventPort;
            b.el('li', { class: 'row' }, (li) => {
                port = li.eventPort(event);
            });
            return { port };
        },
        (P): TExoMachineInitialState<TNode> =>
            (c) => {
                c.on(P.port, (e) => {
                    heard.push(e.type);
                });
            }
    );

const rendered = (event: string, heard: string[]): Element => {
    const parent = host();
    EXO_BACKEND.render(rowListeningFor(event, heard), parent);
    return parent.firstElementChild as Element;
};

describe('an event port whose name the runtime does not know', () => {
    // IF THIS FAILS: an application's own custom events stop being bindable, and every
    // `eventPort('cart:item-added')` in user code is refused at schema-build time.
    it('is accepted, and listens for exactly the string that was declared', () => {
        const heard: string[] = [];
        const row = rendered(INVENTED, heard);

        row.dispatchEvent(new CustomEvent(INVENTED));

        expect(heard).toEqual([INVENTED]);
    });

    // IF THIS FAILS: the name is being normalised somewhere, and an application dispatching its
    // own event with the exact spelling it declared stops being heard.
    it('is NOT normalised — a mis-cased name is a listener for the mis-cased name', () => {
        const heard: string[] = [];
        const row = rendered('Click', heard);

        // The real event. Nothing hears it: this is the dead handler the missing check allows.
        row.dispatchEvent(new Event('click'));
        expect(heard).toEqual([]);

        // And the declared spelling is live.
        row.dispatchEvent(new CustomEvent('Click'));
        expect(heard).toEqual(['Click']);
    });

    // IF THIS FAILS: the two vocabularies have been merged. Whichever way it merged, one of the two
    // is now wrong — either a legal custom event is refused, or a name that closes a quote inside a
    // tag is accepted for an attribute.
    it('would be refused as an ATTRIBUTE name — the check event ports deliberately skip', () => {
        // THE TWO HALVES ARE THE SAME SCHEMA WITH ONE WORD CHANGED, so that the throw is
        // attributable to `port()` and not to anything else about the fixture. A bare
        // `expect(...).toThrow()` would be satisfied by a typo in the cursor call.
        const asEventPort = () =>
            createExoTestMachine(
                (b: TExoSchemaCursor) => {
                    let p!: TExoPort;
                    b.el('li', null, (li) => {
                        p = li.eventPort(INVENTED);
                    });
                    return { p };
                },
                (): TExoMachineInitialState<TNode> => () => {},
                withExoSchemaAsserts
            );
        const asAttrPort = () =>
            createExoTestMachine(
                (b: TExoSchemaCursor) => {
                    let p!: TExoPort;
                    b.el('li', null, (li) => {
                        p = li.port(INVENTED);
                    });
                    return { p };
                },
                (): TExoMachineInitialState<TNode> => () => {},
                withExoSchemaAsserts
            );

        expect(asEventPort).not.toThrow();
        expect(asAttrPort).toThrow();
    });
});
