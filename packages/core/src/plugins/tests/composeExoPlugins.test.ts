// COMPOSING A BACKEND BY MERGE — the four properties the whole plugin system rests on.
//
// Each test here is one of them:
//
//  1. A PLUGIN ADDS A NAME NOBODY DECLARED. A capability does not have to exist as a declared name
//     before anybody can fill it, so it leaves no field on the schema and none on every child: the
//     engine never hears about it.
//  2. A PLUGIN REPLACES. The same act as adding, and the base's method is simply not called.
//  3. A PLUGIN WRAPS. This is the one a plain `Object.assign` cannot do and the reason every entry
//     is a factory taking `next` — it is `super` without a prototype chain, resolved once at merge.
//  4. A METHOD REACHES ITS SIBLINGS THROUGH `this`. Not through a captured object: an exonode is
//     POOLED, one per schema serving every instance in turn, so anything captured at merge time
//     would be a stranger by the time it was called. `this` at call time is always the right
//     one, and it must see the MERGED surface, not the base's.
import { describe, expect, it } from 'vitest';
import { composeExoPlugins } from '../composeExoPlugins';
import type { TExoPlugin } from '../types/TExoPlugin';

/** A base with its methods on the PROTOTYPE, which is what a real backend class is. */
class Base {
    trail: string[] = [];
    set(value: string): void {
        this.trail.push(`base:${value}`);
    }
}

/**
 * THE CAPABILITY CHECK, AT COMPILE TIME — the half of this system that has no runtime part, and the
 * reason `composeExoPlugins` computes its return type instead of handing back its base.
 *
 * A WIRE NAMES WHAT IT NEEDS, structurally, and nothing declares a capability set anywhere. So a
 * component that touches `extra` is satisfied by a backend composed WITH that plugin and refused by
 * one composed without it — which is what replaces the failure mode this whole design exists for: a
 * wire reaching a method a backend does not have, at request time, and printing garbage.
 *
 * THESE ARE `@ts-expect-error` ASSERTIONS AND THEY ARE THE TEST. A line that stops being an error
 * fails the build, so the negative case cannot rot into a silent pass — which a runtime assertion
 * could never catch, since the object is correct at runtime either way.
 */
const withExtraTyped = {
    extra: (_next: unknown) =>
        function (this: Base, v: string): void {
            this.trail.push(`extra:${v}`);
        },
};

/** What a component would declare: "I need a backend that can do `extra`." */
type TNeedsExtra = { extra(v: string): void };

const composedWith = composeExoPlugins(new Base(), withExtraTyped);
const composedWithout = composeExoPlugins(new Base());

// SATISFIED — the plugin's method is in the composed type, read off the factory's return type.
const accepted: TNeedsExtra = composedWith;
// REFUSED — and this line failing to error would mean the check does nothing.
// @ts-expect-error a backend composed without the plugin does not satisfy a wire that needs it
const refused: TNeedsExtra = composedWithout;
// The base's own methods survive the intersection.
composedWith.set('kept');

describe('composing a backend by merge', () => {
    it('carries the plugin methods in the composed TYPE, and refuses without them', () => {
        // The runtime half of the declarations above — they are checked by `tsc`, and naming them
        // here keeps them from being dead code a linter would strip. `composedWith.set('kept')`
        // already ran at module load, which is why the trail opens with it.
        accepted.extra('x');
        expect(composedWith.trail).toEqual(['base:kept', 'extra:x']);
        // `refused` is the `@ts-expect-error` line's subject; at RUNTIME the object is a perfectly
        // good `Base` — which is exactly why only the compiler can catch this, and why the negative
        // assertion has to be a type error rather than a thrown one.
        expect(refused).toBeInstanceOf(Base);
    });

    it('adds a method nobody declared', () => {
        // NOT ANNOTATED `TExoPlugin`, and that is the point rather than a slip: the wide
        // index-signature type erases the NAMES, so a plugin declared as one contributes nothing the
        // composed type can carry. A plugin is written as a literal and its type is inferred.
        const withExtra = {
            extra: (_next: unknown) =>
                function (this: Base, v: string): void {
                    this.trail.push(`extra:${v}`);
                },
        };
        const b = composeExoPlugins(new Base(), withExtra);

        b.extra('x');
        expect(b.trail).toEqual(['extra:x']);
        // AND `next` WAS `undefined`, which is the honest value for "there was nothing here" — the
        // factory above never touched it, and a factory that did would have to handle it.
        expect(Object.prototype.hasOwnProperty.call(b, 'extra')).toBe(true);
    });

    it('replaces a method the base had, without calling it', () => {
        const withReplacement: TExoPlugin = {
            set: () =>
                function (this: Base, v: string): void {
                    this.trail.push(`mine:${v}`);
                },
        };
        const b = composeExoPlugins(new Base(), withReplacement);

        b.set('x');
        expect(b.trail).toEqual(['mine:x']);
    });

    /**
     * THE ONE `Object.assign` CANNOT DO. `next` is read through the prototype, so it is the class's
     * own `set`, and the wrapper calls it with the right `this`.
     */
    it('wraps the base method through `next`', () => {
        const withLogging: TExoPlugin = {
            set: (next) =>
                function (this: Base, v: string): void {
                    this.trail.push('before');
                    (next as (this: Base, v: string) => void).call(this, v);
                    this.trail.push('after');
                },
        };
        const b = composeExoPlugins(new Base(), withLogging);

        b.set('x');
        expect(b.trail).toEqual(['before', 'base:x', 'after']);
    });

    /**
     * ORDER IS THE CALLER'S AND THE LAST PLUGIN IS THE OUTERMOST. Two wrappers over one name have to
     * nest in argument order, or "wrapping" would mean something different depending on how the
     * composition was spelled.
     */
    it('nests two wrappers in argument order, last outermost', () => {
        const inner: TExoPlugin = {
            set: (next) =>
                function (this: Base, v: string): void {
                    this.trail.push('inner-in');
                    (next as (this: Base, v: string) => void).call(this, v);
                    this.trail.push('inner-out');
                },
        };
        const outer: TExoPlugin = {
            set: (next) =>
                function (this: Base, v: string): void {
                    this.trail.push('outer-in');
                    (next as (this: Base, v: string) => void).call(this, v);
                    this.trail.push('outer-out');
                },
        };
        const b = composeExoPlugins(new Base(), inner, outer);

        b.set('x');
        expect(b.trail).toEqual(['outer-in', 'inner-in', 'base:x', 'inner-out', 'outer-out']);
    });

    /**
     * A METHOD SEES THE MERGED SURFACE, INCLUDING NAMES MERGED AFTER IT. `this` is resolved at call
     * time, so a plugin merged first can call one merged third — which is what lets a capability be
     * written against the composition rather than against the base.
     *
     * THE ASSERTION THAT DISCRIMINATES is the last one: it calls a method merged BEFORE its
     * dependency existed. A design that bound methods to the base at merge time would pass every
     * assertion above this one and fail here.
     */
    it('lets a method reach a sibling merged after it, through `this`', () => {
        const first = {
            outerCall: (_next: unknown) =>
                function (this: Base & { helper(): void }): void {
                    this.helper();
                },
        };
        const second = {
            helper: (_next: unknown) =>
                function (this: Base): void {
                    this.trail.push('helper');
                },
        };
        const b = composeExoPlugins(new Base(), first, second);

        b.outerCall();
        expect(b.trail).toEqual(['helper']);
    });
});
