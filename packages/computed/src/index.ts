// The declarative half of a machine. `@exodra/core` builds the imperative one — `createExoMachineBuilder(SCHEMA)`
// with `keep`, `effect`, `on`, `done` — and this decorates it with fields, derivations and
// transitions. The direction is one way: nothing in core names anything here.
export { withExoComputedMachine } from './computed/withExoComputedMachine';
export { exoTransition } from './transitions/exoTransition';
export { EXO_HOLD_VOCABULARY } from './wiring/constants/EXO_HOLD_VOCABULARY';
export { EXO_MOUNTED } from './lifecycle/constants/EXO_MOUNTED';
export { exoMachineSettle } from './transitions/exoMachineSettle';
export { exoBoundTransition } from './transitions/exoBoundTransition';
export { bindExoMachineReads } from './fields/bindExoMachineReads';
export { EXO_MACHINE_LIMIT } from './transitions/constants/EXO_MACHINE_LIMIT';
export { exoFieldBit } from './fields/exoFieldBit';
export { exoMachineField } from './fields/exoMachineField';
export { exoComputed } from './computed/exoComputed';
export { exoBody } from './lifecycle/exoBody';
export { compileExoMachine } from './machine/compileExoMachine';
export { commitExoMachine } from './machine/commitExoMachine';
export { runExoMachineSlots } from './machine/runExoMachineSlots';
export { fillExoMachineDerivations } from './fields/fillExoMachineDerivations';
export { chainExoMachineWakes } from './machine/chainExoMachineWakes';
export type { TExoComputedBuilder } from './computed/types/TExoComputedBuilder';
export type { TExoComputedMachine } from './computed/types/TExoComputedMachine';
export type { TExoComputedLive } from './computed/types/TExoComputedLive';
export type { TExoCommitNode } from './computed/types/TExoCommitNode';
export type { TExoComputedMachineNode } from './computed/types/TExoComputedMachineNode';
export type { TExoMachineDeclared } from './machine/types/TExoMachineDeclared';
export type { TExoMachineDerivation } from './machine/types/TExoMachineDerivation';
export type { TExoMachineBody } from './machine/types/TExoMachineBody';
export type { TExoMachineField } from './fields/types/TExoMachineField';
export type { TExoHoldApi } from './wiring/types/TExoHoldApi';
export type { TExoMachineFieldHandle } from './fields/types/TExoMachineFieldHandle';
export type { TExoMachineProgram } from './machine/types/TExoMachineProgram';
export type { TExoMachineReads } from './fields/types/TExoMachineReads';
export type { TExoMachineSettler } from './transitions/types/TExoMachineSettler';
export type { TExoMachineDeclaration } from './machine/types/TExoMachineDeclaration';
export type { TExoMachineTarget } from './machine/types/TExoMachineTarget';
export type { TExoMachineWake } from './machine/types/TExoMachineWake';

// The per-instance door: the same declarations made inside a wire instead of once at module load.
export { exoWiring } from './wiring/exoWiring';
export { ExoWiringBlock } from './wiring/ExoWiringBlock';
export type { TExoWiringSite } from './wiring/types/TExoWiringSite';

// NOT RE-EXPORTED, AND THAT IS DELIBERATE: `TExoMachineBuilder`, `TExoMachine`,
// `TExoMachineNode`, `TExoMachineEffect`, `TExoMachineStateHandle`,
// `TExoFillDoors` and `TExoInstanceWork` are `@exodra/core`'s. Four of them are named in this
// package's own signatures and would re-export cleanly, but `kept()` and `restartEffect()` are
// methods on EVERY node (`packages/core/src/plugins/constants/EXO_BASE_NODE_VOCABULARY.ts`), so the types belong where the
// implementation is. Two spellings of one type is a second accessor; import them from
// `@exodra/core`.
