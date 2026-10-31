import type { TExoTermElement } from '../../instance/types/TExoTermElement';

// Decided once at schema time, so filling a port is one indirect call with no branch on its kind.
// It takes the target ELEMENT, not the instance: children and events are not filled through `set`.
export type TExoTermWriter = (node: TExoTermElement, value: unknown) => void;
