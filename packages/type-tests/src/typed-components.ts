// Type-level regression test for typed custom components in Exodra JSX.
//
// `defineComponent<A>` brands a component with a phantom props type `A`. That `A`
//   (1) types `<Comp .../>` attributes via `JSX.LibraryManagedAttributes`, and
//   (2) types the `context` inside the component body (getConstant/getBindable).
// Asserted with `@ts-expect-error`; run by `npm run test:types` (tsc --noEmit).
//
// This file intentionally declares values used only in type positions and uses
// `@ts-expect-error`, so the whole package is excluded from eslint.

import type { JSX } from '@exodra/jsx';
import type { TExoSchema } from '@exodra/core';
import { defineComponent } from '@exodra/core';
import { bindable } from '@exodra/reactivity';
import type { TExoBindable } from '@exodra/reactivity';

const schema = null as unknown as TExoSchema;

// A component that DECLARES its props via the phantom generic.
const Typed = defineComponent<{
    static: { title: string };
    bindable: { count: TExoBindable<number> };
}>((ctx) => {
    // (2) context is typed from A — no manual generics needed.
    const title = ctx.getConstant('title');
    const count = ctx.getBindable('count');
    const t: string = title;
    const c: TExoBindable<number> = count;
    // @ts-expect-error getConstant('title') is string, not number
    const bad: number = ctx.getConstant('title');
    void t;
    void c;
    void bad;
    return schema;
});

// A component with NO declared props — bucket-shaped props, loose context.
const Loose = defineComponent((ctx) => {
    const anything = ctx.getConstant('whatever'); // unknown
    void anything;
    return schema;
});

// (1) This is EXACTLY the type TS uses to check `<Comp .../>` attributes.
type TypedAttrs = JSX.LibraryManagedAttributes<typeof Typed, unknown>;
type LooseAttrs = JSX.LibraryManagedAttributes<typeof Loose, unknown>;

// ---- Typed component: strict checking against the declared buckets ----
const ok: TypedAttrs = { static: { title: 'x' }, bindable: { count: bindable(0) } };
// @ts-expect-error title must be a string, not a number
const badTitle: TypedAttrs = { static: { title: 123 }, bindable: { count: bindable(0) } };
// @ts-expect-error unknown key in the static bucket is rejected
const badKey: TypedAttrs = { static: { title: 'x', nope: 1 }, bindable: { count: bindable(0) } };
// @ts-expect-error count must be a TExoBindable<number>, not a raw number
const badBindable: TypedAttrs = { static: { title: 'x' }, bindable: { count: 5 } };

// ---- Loose component: bucket-shaped props accepted, flat props rejected ----
const looseOk: LooseAttrs = { static: { anything: 1 }, bindable: { x: bindable(0) } };
// @ts-expect-error flat (non-bucketed) props are not allowed
const looseFlat: LooseAttrs = { whatever: 1 };

void ok;
void badTitle;
void badKey;
void badBindable;
void looseOk;
void looseFlat;
