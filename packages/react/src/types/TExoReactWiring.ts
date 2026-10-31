import type { TExoWiring } from '@exodra/core';

// `Pick` makes these PROPERTIES — contravariant under `strictFunctionTypes`, where a method's
// params stay bivariant. `onTeardown` unmounts the root; `unsafeHtml` fills a children port for SSR.
export type TExoReactWiring = Pick<TExoWiring, 'unsafeHtml' | 'onTeardown'>;

// Exactly the fields `reactIsland.ts` loads off the backend's instance record, and no other: a
// field named here but never read would not signal when the record reshapes it.
export type TExoReactDomWiring = TExoReactWiring & {
    readonly nodes: readonly Node[];
    // Port index -> slot in `nodes`. An adopting schema carries both: `elem` is the silenced
    // adoption table (children ports all at slot 0); `liveElem` addresses the page.
    readonly schema: {
        readonly elem: Int32Array;
        readonly liveElem?: Int32Array;
    };
};
