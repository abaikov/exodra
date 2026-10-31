import { exoMachineSettle } from './exoMachineSettle';
import type { TExoCommitNode } from '../computed/types/TExoCommitNode';
import type { TExoMachineDeclared } from '../machine/types/TExoMachineDeclared';
import type { TExoMachineProgram } from '../machine/types/TExoMachineProgram';

export function exoTransition<TState extends TExoCommitNode>(
    of: TExoMachineDeclared<TState>,
    apply: (enode: TState) => void
): (enode: TState) => void;
export function exoTransition<TState extends TExoCommitNode, TFirst>(
    of: TExoMachineDeclared<TState>,
    apply: (enode: TState, first: TFirst) => void
): (enode: TState, first: TFirst) => void;
export function exoTransition<TState extends TExoCommitNode, TFirst, TSecond>(
    of: TExoMachineDeclared<TState>,
    apply: (enode: TState, first: TFirst, second: TSecond) => void
): (enode: TState, first: TFirst, second: TSecond) => void;
export function exoTransition<TState extends TExoCommitNode, TFirst, TSecond>(
    of: TExoMachineDeclared<TState>,
    apply: (enode: TState, first: TFirst, second: TSecond) => void
): (enode: TState, first: TFirst, second: TSecond) => void {
    const program: TExoMachineProgram<TState> = 'program' in of ? of.program : of;
    if (program.computes.length === 0 && program.bodyMask === 0) {
        return apply;
    }
    const settle = exoMachineSettle(program);

    return (enode, first, second) => {
        apply(enode, first, second);
        settle(enode);
    };
}
