import type {
    TExoChildrenPort,
    TExoChildrenWiring,
    TExoMachine,
    TExoMachineNode,
    TExoNode,
} from '@exodra/core';

// The PLACEMENT DOOR, named here rather than imported: `@exodra/list-reconcile` is one composition
// over it and a rule may use another, so what this suite requires of a backend is the door.
export type TExoConformancePlacement = {
    readonly size: number;
    at(i: number): TExoNode | undefined;
    insert(child: TExoNode, i?: number): void;
    move(from: number, to: number): void;
    remove(i: number): void;
    removeAll(): void;
};

// The MINIMAL exonode surface and not any backend's class, so one value reaches all four entry
// points WITH NO CAST: a wire's exonode parameter is contravariant, so a component typed against a
// backend's class is backend-only whatever the design promised. `portChildList` is in it because ALL
// THREE backends answer it and the suite states rules about reconciled lists. `TExoMachineNode` is in
// it because a rule that follows a source does so through an effect, which needs the instance's state.
export type TExoConformanceMachine = TExoMachine<
    TExoChildrenWiring &
        TExoMachineNode & {
            portChildList(port: TExoChildrenPort): TExoConformancePlacement;
        }
>;

// Every method beyond `sketch` and `dispose` is gated by a capability the adapter declares; the
// runner never reaches one a backend lacks, having routed the rule to CANNOT-EXPRESS first.
export type TExoConformanceRun = {
    // `probe` names DOM properties to print beside the attributes. Requires `EXO_CAP_ELEMENT`.
    sketch(probe: readonly string[]): string;
    // Delivered to the FIRST instance's root. Requires `EXO_CAP_LIVE_TREE`.
    fire(type: string): void;
    // Wraps the first Text node in a third party's `<font>`. Requires `EXO_CAP_TEXT_NODE`.
    translate(): void;
    // Called in a `finally`, so it must be safe to call twice.
    dispose(): void;
};

// `compile` is split from `render` because some rules claim WHICH LAYER refuses a shape: calling
// only `render` records "it threw" and can neither confirm nor falsify that. There is no `update`
// (a rule owns its sources, which must be fresh per backend) and no `markup` — see README.md.
export type TExoConformanceAdapter = {
    // The key a rule writes its expectation under; `pkg` is the full spelling, for messages.
    readonly name: string;
    readonly pkg: string;
    // What this backend HAS. Cross-checked against every rule that runs on it.
    readonly can: ReadonlySet<string>;
    // Throws for a refusal that belongs to the compiler rather than to the wiring.
    compile(machine: TExoConformanceMachine): void;
    render(machine: TExoConformanceMachine, n: number): TExoConformanceRun;
};
