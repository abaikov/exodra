import { commitExoMachine } from '../machine/commitExoMachine';
import { runExoMachineSlots } from '../machine/runExoMachineSlots';
import type { TExoCommitNode } from '../computed/types/TExoCommitNode';
import type { TExoMachineProgram } from '../machine/types/TExoMachineProgram';

export function exoMachineSettle<TState extends TExoCommitNode>(
    program: TExoMachineProgram<TState>
): (enode: TState) => void {
    return program.bodyMask === 0
        ? (enode: TState): void => {
              commitExoMachine(program, enode);
          }
        : (enode: TState): void => {
              commitExoMachine(program, enode);
              runExoMachineSlots(program, enode);
          };
}
