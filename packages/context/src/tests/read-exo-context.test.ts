// THE CONTEXT CHAIN, ASSERTED AT THE LEVEL THAT OWNS IT.
//
// WHAT @exodra/context ACTUALLY EXPORTS IS TWO FUNCTIONS AND NO HEAD. `exoContextFrame` makes one
// link, `readExoContext` walks from a link outwards, and where the head of a chain LIVES is
// each backend's business — the DOM backend hangs it off the element that provided,
// `@exodra/string` and `@exodra/term` each keep a module-level slot saved and restored around
// every nested build. Three backends, three holders, one rule.
//
// A BACKEND'S TEST CANNOT ASSERT THE SHARED HALF. `@exodra/dom`'s `exo-context.test.ts` is the
// thorough one and it is declared `@vitest-environment jsdom`; `@exodra/ssr` and `@exodra/term`
// each assert their own holder. The rule all three holders implement is asserted HERE, so a new
// backend written outside this repository has something to check itself against.
//
// THE ONE RULE THAT MATTERS AND THE HALF OF IT THAT LIVES HERE. A child built AFTER the wire
// that declared it returned — a list row that arrives an hour after page load, a lazily
// mounted route — must resolve against the frame that was in force WHEN ITS PORT WAS BOUND, and
// not against whatever the backend's holder happens to point at now. That rule has two halves:
//
//   1. THE SNAPSHOT. Holding a frame must be enough to reconstruct what was visible there,
//      permanently, no matter what is pushed afterwards and no matter what else is holding it.
//      That is a property of these two functions and it is asserted here, in full.
//   2. THE BRACKET. Somebody has to have SAVED that frame at bind time and to restore the
//      holder afterwards. That is the backend's, because the holder is the backend's, and it
//      cannot be tested from here — there is no head in this package to save.
//
// The last describe below is (1) written as the scenario that (2) exists to serve, with a
// hand-rolled holder standing in for a backend's, so the failure it prevents is visible in the
// package that supplies the primitive rather than only in the four that use it.
import { describe, expect, it } from 'vitest';
import { exoContextToken } from '../exoContextToken';
import { exoContextFrame } from '../exoContextFrame';
import { readExoContext } from '../readExoContext';
import type { TExoContextFrame } from '../types/TExoContextFrame';

const THEME = exoContextToken<string>('theme');
const ROUTER = exoContextToken<string>('router');

describe('readExoContext', () => {
    it('answers undefined when nobody provided anything at all', () => {
        expect(readExoContext(null, THEME)).toBeUndefined();
    });

    it('answers undefined for a token nobody provided, however long the chain', () => {
        const frame = exoContextFrame(exoContextFrame(null, THEME, 'dark'), THEME, 'light');
        expect(readExoContext(frame, ROUTER)).toBeUndefined();
    });

    it('finds a value provided at the outermost link from anywhere below it', () => {
        const outer = exoContextFrame(null, THEME, 'dark');
        const deeper = exoContextFrame(exoContextFrame(outer, ROUTER, '/home'), ROUTER, '/about');
        expect(readExoContext(deeper, THEME)).toBe('dark');
    });

    it('takes the NEAREST value, which is the whole of what shadowing is', () => {
        // Nothing is removed when an inner scope ends and nothing has to be: the inner link is
        // simply in front, so the walk meets it first.
        const outer = exoContextFrame(null, THEME, 'dark');
        const inner = exoContextFrame(outer, THEME, 'light');
        expect(readExoContext(inner, THEME)).toBe('light');
        // …and the outer value is still there, reachable through the outer frame. This is the
        // assertion that says shadowing is non-destructive rather than merely ordered.
        expect(readExoContext(outer, THEME)).toBe('dark');
    });

    it('compares tokens by IDENTITY, so two contexts with the same name never collide', () => {
        // `name` is for a debugger and is never compared — see `TExoContextToken`. Two packages
        // that both call their key 'theme' must not be able to read each other's value.
        const mine = exoContextToken<string>('theme');
        const theirs = exoContextToken<string>('theme');
        const frame = exoContextFrame(null, mine, 'dark');
        expect(readExoContext(frame, mine)).toBe('dark');
        expect(readExoContext(frame, theirs)).toBeUndefined();
    });

    it('cannot tell a provided undefined from no provide, which is the documented answer', () => {
        // Stated as a test rather than left in prose, because it is the one place the lookup
        // gives an answer that is not the whole truth. Paying a sentinel per link to tell the
        // two apart would cost every lookup in the process; there is no reason to provide
        // `undefined`; so this is what happens, on purpose.
        const provided = exoContextFrame(null, THEME, undefined as unknown as string);
        expect(readExoContext(provided, THEME)).toBeUndefined();
        expect(readExoContext(null, THEME)).toBeUndefined();
    });
});

describe('exoContextFrame', () => {
    it('FORKS: two pushes onto one frame are two chains that cannot see each other', () => {
        // THE PROPERTY EVERY SIBLING SUBTREE RESTS ON. Two children of one provider each push
        // their own value; neither may become visible to the other, and the parent must be
        // unchanged by both. If a link were mutated in place instead of allocated in front,
        // this is the assertion that would fail — and in an application it would show up as a
        // route reading the modal's theme.
        const shared = exoContextFrame(null, THEME, 'dark');
        const left = exoContextFrame(shared, THEME, 'left');
        const right = exoContextFrame(shared, THEME, 'right');

        expect(readExoContext(left, THEME)).toBe('left');
        expect(readExoContext(right, THEME)).toBe('right');
        expect(readExoContext(shared, THEME)).toBe('dark');
    });

    it('builds a link whose `outer` is exactly the chain it was handed', () => {
        const outer = exoContextFrame(null, ROUTER, '/home');
        const frame = exoContextFrame(outer, THEME, 'dark');
        expect(frame.outer).toBe(outer);
        expect(frame.value).toBe('dark');
        expect(frame.key).toBe(THEME);
    });
});

describe('a child built AFTER the wire that declared it returned', () => {
    /**
     * A BACKEND'S HOLDER, in miniature. Every backend has one of these — a module-level slot,
     * or a field on the node that provided — and every backend brackets a nested build by
     * saving it, building, and putting the old value back. This stands in for all four so the
     * scenario can be written down in the package that supplies the primitive.
     */
    const slot: { frame: TExoContextFrame | null } = { frame: null };

    /** What an exonode's `provide` does: one link in front, and the holder now points at it. */
    const provide = (value: string): void => {
        slot.frame = exoContextFrame(slot.frame, THEME, value);
    };

    /** What an exonode's `inject` does: read the holder. */
    const inject = (): string | undefined => readExoContext(slot.frame, THEME);

    /**
     * What a wire does when it binds a children port: it captures the frame IN FORCE NOW, and
     * the deferred build later restores it around the build. The whole of the rule, in two
     * lines, and the reason the frame has to be a permanent snapshot rather than a pointer into
     * something live.
     */
    const bindDeferred = (): (() => string | undefined) => {
        const atBindTime = slot.frame;
        return () => {
            const saved = slot.frame;
            slot.frame = atBindTime;
            try {
                return inject();
            } finally {
                slot.frame = saved;
            }
        };
    };

    it('resolves against the frame in force when its port was BOUND, not the one in force now', () => {
        slot.frame = null;
        provide('dark'); // the shell provides
        const buildRow = bindDeferred(); // a list port is bound here, under 'dark'

        // …the wire returns, the shell's bracket pops, and an unrelated subtree runs and
        // provides something else entirely. In a real page this is an hour later, in a modal.
        slot.frame = null;
        provide('print-preview');

        expect(buildRow()).toBe('dark');
        // And the deferred build put the holder back, so the subtree that was mid-render is
        // unharmed. This is the half a missing `finally` loses.
        expect(inject()).toBe('print-preview');
    });

    it('sees a shadowing provide that was already in force at bind time', () => {
        // The other direction, so the test above cannot be satisfied by capturing the OUTERMOST
        // frame instead of the current one: what the row must see is what was nearest THEN.
        slot.frame = null;
        provide('dark');
        provide('light'); // an inner provider, still open when the port is bound
        const buildRow = bindDeferred();
        slot.frame = null;

        expect(buildRow()).toBe('light');
    });
});
