import type { TExoBaseNodeFields } from './TExoBaseNodeFields';

// NOT polymorphic `this` (it resolves to the TABLE's type inside a merged pack) and not
// `TExoBaseNodeFields` (too wide — @exodra/dom's bare record carries no `disposers`).
export type TExoEffectOwner = Pick<TExoBaseNodeFields, 'effectStops'>;
