import type { TExoNode } from '../../schema/types/TExoNode';
import type { TExoTransitionArgs } from './TExoTransitionArgs';

export type TExoMachineTransitions<TWiring, TData extends Record<string, TExoTransitionArgs>> = {
    readonly [K in keyof TData]: (enode: TWiring | TExoNode, ...data: TData[K]) => void;
};
