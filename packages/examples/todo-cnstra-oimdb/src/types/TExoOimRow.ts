import type { TExoNode } from '@exodra/core';
import type { TExoDomMark } from '@exodra/dom';

export type TExoOimRow = TExoNode<TExoDomMark> & { unmount(): void };
