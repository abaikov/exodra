import type { TExoCommitNode } from '../computed/types/TExoCommitNode';
import type { TExoMachineSettler } from './types/TExoMachineSettler';

const HERE = 'exoBoundTransition';

export function exoBoundTransition<TState extends TExoCommitNode>(
    of: TExoMachineSettler<TState>,
    apply: (enode: TState) => void
): () => void;
export function exoBoundTransition<TState extends TExoCommitNode, TFirst>(
    of: TExoMachineSettler<TState>,
    apply: (enode: TState, first: TFirst) => void
): (first: TFirst) => void;
export function exoBoundTransition<TState extends TExoCommitNode, TFirst, TSecond>(
    of: TExoMachineSettler<TState>,
    apply: (enode: TState, first: TFirst, second: TSecond) => void
): (first: TFirst, second: TSecond) => void;
export function exoBoundTransition<TState extends TExoCommitNode, TFirst, TSecond>(
    of: TExoMachineSettler<TState>,
    apply: (enode: TState, first: TFirst, second: TSecond) => void
): (first: TFirst, second: TSecond) => void {
    return (first, second) => {
        const enode = of.instance;
        if (enode === null) {
            throw new Error(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `${HERE}: this transition fired before its wiring block armed; call done() ` +
                      'at the end of the wire, before anything can dispatch into it.'
                    : 'EXO0083'
            );
        }
        apply(enode, first, second);
        const settle = of.settle as (enode: TState) => void;
        settle(enode);
    };
}
