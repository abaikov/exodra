import type { TExoContextFrame } from '@exodra/context';

// The OUTER frame a caller installs above a whole render, read once by `renderScreen` to seed the
// roots' chain — `@exodra/core` exports the LINK and the LOOKUP and no head at all. NOT the head
// during a wire: the chain lives on the instance and travels as an argument, so `provide`/`inject`
// touch nothing here. The only module state this backend has.
export const exoTermContextSlot: { frame: TExoContextFrame | null } = { frame: null };
