import type { TExoDomInstanceRecord } from './TExoDomInstanceRecord';

// A reconciled child IS the instance's record, not a wrapper round one, and the element holds no
// pointer back. `mount`/`unmount` are called BLINDLY by whatever holds the child, which is what
// lets a keep-alive block survive removal. Every slot is present at construction, in one order.
export type TExoDomChild = {
    // `undefined` until this child is materialised — the test that catches a hand-made element.
    node: Element;
    mount(this: TExoDomChild): void;
    // Run while this child's element is still ATTACHED, just before it is taken out.
    unmount(this: TExoDomChild): void;
    // What `onTeardown` pushes into; `null` until the first, emptied rather than nulled on disposal.
    disposers: Array<() => void> | null;
    // The base's instance slots arrive from the intersection below. `createExoDomChildFactory` writes the
    // first eleven FIRST — in front of `node` — and `live` LAST, so both record shapes agree at
    // those field indices; the declaration order here is not the literal order.
} & TExoDomInstanceRecord;
