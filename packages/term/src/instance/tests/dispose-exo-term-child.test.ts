// THE ORDER THE DRAIN RUNS IN, which `@exodra/core` decides on this package's behalf and then has
// no way to check. A wiring block owns `stopEffects` before its first body slot and
// `setMounted(false)` LAST, so only a forward drain empties `effectStops` before the unmount
// transition fires — and that emptiness is what `restartEffect` reads as its refusal. Drained
// backwards, the transition arrives while the effects are still live and RESTARTS the one being
// torn down: user code that asked to run while mounted runs again at the moment of unmounting.
//
// The wire is typed against `TExoComputedMachineNode` and never against `TExoTermNode`, like the rest of
// this suite: a test naming the backend it tests proves nothing about portability.
import type { TExoSchemaCursor, TExoPort } from '@exodra/core';
import { exoWiring } from '@exodra/computed';
import type { TExoComputedMachineNode } from '@exodra/computed';
import { describe, expect, it } from 'vitest';
import { ExoTermBackend } from '../../backend/ExoTermBackend';
import { createExoTestMachine } from '@exodra/test-utils';

/** ONE BACKEND FOR THE FILE: the schema cache is keyed on it by pointer. */
const BACKEND = new ExoTermBackend();

function buildCard(b: TExoSchemaCursor): { live: TExoPort } {
    let live!: TExoPort;
    b.el('li', null, (li) => {
        live = li.port('data-live');
    });
    return { live };
}

/**
 * `mounted()` IS WHAT PUTS A SECOND DISPOSER ON THE INSTANCE — the unmount transition, registered
 * behind the one that stops effects. Nothing on this backend ever sets it true: term inserts into
 * no document, so its instances carry no `live` slot and the field reads false for the whole
 * lifetime. The subject is the teardown ORDER, and false→false wakes the effect as true→false does.
 */
function makeCard(log: string[]) {
    return createExoTestMachine<{ live: TExoPort }, TExoComputedMachineNode>(buildCard, (P) =>
        exoWiring<TExoComputedMachineNode>((w) => {
            const mounted = w.mounted();
            w.derive(P.live, [mounted], (on) => (on ? 'yes' : 'no'));
            w.effect([mounted], (c) => {
                const on = mounted.get(c);
                log.push(`start ${on}`);
                return (): void => {
                    log.push(`stop ${on}`);
                };
            });
            w.done();
        })
    );
}

describe('disposeExoTermChild', () => {
    it('stops an effect ONCE and never restarts it while tearing the instance down', () => {
        const log: string[] = [];
        const screen = BACKEND.renderScreen(makeCard(log), 1);
        expect(log).toEqual(['start false']);
        log.length = 0;

        screen.dispose();

        // `@exodra/dom` pins the same shape — one stop, nothing behind it — at
        // `exo-mounted-paths.test.ts`, "goes false again when the instance is DESTROYED".
        // Drained backwards this reads ['stop false', 'start false', 'stop false'].
        expect(log).toEqual(['stop false']);
    });
});
