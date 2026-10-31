// WHERE A COMPONENT'S STATE LIVES — the two shapes `@exodra/core` does NOT ship, written out here
// so that the proposal is a file somebody reads rather than a diff somebody reconstructs.
//
// ═══ CORE HAS SINCE SHIPPED VARIANT 2, AND THAT IS SAID FIRST ═══
//
// An instance's state is now `enode.state`, a flat numbered array on the exonode, and a field handle
// carries the ROW it reads (`TExoMachineField.row`); `bindExoMachineReads` has a specialisation for
// exactly that case. So variant 2 below is no longer a proposal — it is what a machine written with
// `m.field` or `w.field` gets. Variant 3, sharing the numbering with the node table, still is not
// shipped, and variant 1 — the NAMED-FIELD OBJECT — is no longer what the library does anywhere.
// The three rows still measure three real shapes, and this file is what builds them; what has
// changed is which one is the incumbent.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE QUESTION, AND WHY IT IS PURELY ABOUT COST ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// `machine-vs-cells`'s `C` rows keep an instance's state as AN OBJECT WITH NAMED FIELDS — `{ name,
// open, width, note }` plus what the enode contract asks for. Nothing in user code depends on that
// choice: a derivation is handed the VALUES of the fields it declared and never names one, and a
// field is reached only through a `TExoMachineField`, which carries its own reader and writer.
// Change what those two closures do and every other part of the machine — the inverted field table,
// the pending word, the bit walk, the port write — is unchanged.
//
// So there are three candidates and the only thing that separates them is what they cost:
//
//   1. NAMED OBJECT       `{ name: 'x', open: false, width: 0, … }`. A field is a named property;
//                         its reader is `(s) => s.name` and its writer `(s, v) => { s.name = v; }`.
//                         MEASURED BY IMPORTING THE SHIPPED MACHINERY — the `C` rows of
//                         `machine-vs-cells` are it, and nothing here re-implements it.
//   2. SEPARATE TABLE     the instance's own flat array. Field `f` is `state[f]`; state slots are
//   (`C·tbl`)             numbered in THEIR OWN space, starting at zero. Per instance: the state
//                         object AND the array — two allocations where the object form makes one.
//   3. SHARED TABLE       the SAME array the instance's DOM nodes live in. Field `f` is
//   (`C·shr`)             `state[BASE + f]`, where `BASE` is the number of node slots the schema
//                         hands out, so markup ports and state fields share ONE numbering. Per
//                         instance: the state object and NOTHING ELSE — the values are appended
//                         onto an array `wireExoInstance` allocated anyway.
//
// THE PENDING WORD RIDES IN THE SAME ARRAY FOR BOTH TABLE VARIANTS, in the slot immediately after
// the fields, because `TExoCommitNode` names it by ROW and both variants have a row to spare.
// That is what keeps variant 3 at ONE allocation per instance, which is its whole claim.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── THE RISK VARIANT 3 CARRIES, AND IT IS WHY THE TIMED REGIONS HOLD REAL PORT WRITES ───────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// Today the node table is `Node[]` and UNIFORM: `wireExoInstance` starts it as `[root]` and every
// walk landing appends at `nodes.length`, so it is packed and holds one kind of thing. It is read on
// EVERY PORT WRITE — `c.portNodeWriter()` hands back `setters[i](nodes[elem[i]], value)` — which is
// the hottest load in the whole update path.
//
// Variant 3 puts strings, booleans and numbers into that array. Two things could go wrong and
// neither is visible by reading:
//
//   · THE ELEMENT KIND. Appending a string to a packed array of objects keeps it `PACKED_ELEMENTS`
//     (both are tagged pointers), so nothing degrades to holey — PROVIDED the appends are in
//     ASCENDING SLOT ORDER, which `seedField` below guarantees by looping `f = 0 .. fields - 1`.
//     Writing slot `BASE + 3` before `BASE + 0` would leave three holes and make the array
//     `HOLEY_ELEMENTS` for the life of the instance, and every port write would then carry a
//     prototype-chain check. That is a real trap and it is one line away.
//   · THE ARRAY GETS LONGER, so the backing store is reallocated as the state is appended and the
//     node slots are further from each other in memory than they were.
//
// NEITHER SHOWS ON A TABLE THAT ONLY WRITES STATE. So every scene this file's variants appear on —
// except the unread-field tables, which exist precisely to measure a write that reaches no port —
// ends in real port writes through `state.portWrite`.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHICH SCENE FLATTERS WHICH, SAID BEFORE ANY NUMBER ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// THE NARROW SCENE (four fields: a string, a boolean and two numbers) FLATTERS THE OBJECT. Four
// named slots is what V8's in-object storage is best at; the two tables carry an extra indirection
// (`s.state` then `state[at]`) to reach values that the object form reaches in one load, and four
// values is too few for a table's own advantages to pay for it.
//
// THE WIDE SCENE (twenty integer fields, twenty derivations) FLATTERS THE TABLES, and for three
// separate reasons that should be read apart:
//   · A TRANSITION WRITING A COMPUTED FIELD NUMBER is an indexed store, `state[BASE + f] = v`. The
//     object form cannot index a named property, so `machine-vs-cells`'s wide transitions go through
//     `WIDE_WRITE_FIELD[f](s, v)` — a closure call per field written. That difference is real and it
//     is the shape's, not a rigging; the loops are otherwise line-for-line identical, and both mark
//     per field rather than pre-merging (a pre-merged mark is available to all three and would be a
//     different measurement).
//   · TWENTY INTEGERS IN THEIR OWN ARRAY is `PACKED_SMI_ELEMENTS` for variant 2 — the one shape here
//     where a store needs no write barrier and a load needs no smi check. Variant 3's array holds
//     Nodes, so it is `PACKED_ELEMENTS` and gets neither.
//   · A TWENTY-FIELD OBJECT is past the point where V8 keeps everything in-object for a literal of
//     this shape, and the two tables are unaffected by field count.
//
// A READER WHO TAKES EITHER SCENE ALONE IS READING ONE FORM'S BEST CASE. The pair is the finding.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHAT THIS FILE DELIBERATELY DOES NOT DO ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
//  · IT DOES NOT TOUCH `@exodra/core` OR `@exodra/dom`. Both variants are built out of the shipped
//    machine exactly as a user would build one: `exoMachineField` with a different reader and
//    writer, `compileExoMachine`, `fillExoMachineDerivations`, `exoTransition`, `commitExoMachine`.
//    THE COMMIT LOOP, THE INVERTED TABLE AND THE PORT WRITE ARE THE SHIPPED ONES for all three
//    variants, so a difference between the rows is a difference of state shape and of nothing else.
//  · IT DOES NOT GIVE VARIANT 3 A PLACE IN THE SCHEMA. `BASE` is discovered at the FIRST WIRE, from
//    `c.nodes.length` — a wire is handed the instance's own record and the node table is a field of
//    it — because a schema does not exist until the first render; the same reason
//    `machine-vs-cells`'s `C·direct` flattens its writers there. A shipped version of variant 3
//    would have the compiler hand the base out and would pay nothing for the discovery; this pays
//    ONE null comparison per instance mount, and that comparison is inside the timed mount region.
//    It is named here rather than subtracted.
//  · IT DOES NOT MEASURE TEARDOWN, MEMORY OR A STATE HOLDING DOUBLES. Every value in both scenes is
//    a string, a boolean or a small integer, so nothing here ever boxes; a `PACKED_ELEMENTS` array
//    holding a double allocates a HeapNumber per write and variant 3 would pay it where the object
//    form's in-object double slot does not. No row below says anything about that case.

import {
    type TExoSchemaCursor,
    type TExoPort,
    type TExoPortNodeWriter,
    type TExoPortTable,
} from '@exodra/core';
import {
    compileExoMachine,
    exoMachineField,
    fillExoMachineDerivations,
    type TExoCommitNode,
    type TExoMachineDerivation,
    type TExoMachineField,
    type TExoMachineProgram,
} from '@exodra/computed';
import type { TExoDomMachine, TExoDomNode } from '@exodra/dom';
import { createExoSchema, createExoMachineBuilder } from '@exodra/core';
import type { TExoMachineInitialState } from '@exodra/core';

/** The connector a DOM wire is handed — named without importing the class. */
type TExoWiredWiring = TExoDomNode;

/**
 * AN ENODE THAT IS NOT A BACKEND'S — what a component hand-assembling its own program has to be, now
 * that a machine's state lives on the object the backend wires. `TExoCommitNode` asks for two
 * members: the numbered slot table the pending word lives in, and the door a derived value leaves
 * by. This adds the pair the door is built out of.
 *
 * ONE SHARED FUNCTION stands behind all three fill doors, assigned by reference into every
 * instance's literal, so no instance allocates a forwarder: it writes through `c.portNodeWriter()`,
 * which is the door's line.
 */
export interface TExoDetachedNode extends TExoCommitNode {
    readonly portTable: TExoPortTable;
    readonly portWrite: TExoPortNodeWriter;
}

export function exoDetachedWrite(this: TExoDetachedNode, port: TExoPort, value: unknown): void {
    this.portWrite(this.portTable, port, value);
}

/**
 * WHAT AN INSTANCE OF EITHER TABLE VARIANT IS — the enode contract and nothing else, because the
 * table the fields live in IS the slot table the contract already names.
 *
 * VARIANT 2: `state` is this instance's own array. VARIANT 3: it is this instance's NODE array, and
 * it is the same array `portTable` holds. One state type serves both, which is what makes the two
 * rows comparable — the readers, the writers, the commit and the fill are then literally the same
 * code, and only which array `state` points at differs.
 */
export type TExoStateTableState = TExoDetachedNode;

/**
 * ONE NUMBERED FIELD OF A TABLE-BACKED STATE — the whole of what changes against the named-field
 * shape.
 *
 * The object form's field is `(s) => s.name` / `(s, v) => { s.name = v; }`. This is `(s) =>
 * s.state[at]` / `(s, v) => { s.state[at] = v; }`, with `at` closed over ONCE at declaration so the
 * base addition never happens on a path that runs. Everything else about the field — its index, its
 * bit, its place in the inverted table — is the shipped `exoMachineField`'s.
 *
 * THE ROW IS LEFT AT `-1` and the reader is a closure, which is what `exoMachineField` hands out: a
 * row-backed handle would let `bindExoMachineReads` load the slot directly, and taking that path
 * here would make this row measure the specialisation instead of the shape. It reads through the
 * same closure the named-field form reads through.
 *
 * THE CAST IS FREE. A table cannot state that slot 0 is a `string` and slot 1 a `boolean`, so the
 * reader asserts what the declaration already knows. It costs nothing at run time, and what it gives
 * up against the object form is that the compiler no longer checks it — which is a real cost of this
 * shape, paid in types rather than in nanoseconds, and no table below can price it.
 */
export const exoStateTableField = <TValue>(
    index: number,
    base: number
): TExoMachineField<TExoStateTableState, TValue> => {
    const at = base + index;
    return exoMachineField<TExoStateTableState, TValue>(
        index,
        (s) => s.managedState[at] as TValue,
        (s, v) => {
            s.managedState[at] = v;
        }
    );
};

/** The same, for a component whose fields are all one type — the wide scene's twenty integers. */
export const exoStateTableFields = <TValue>(
    count: number,
    base: number
): readonly TExoMachineField<TExoStateTableState, TValue>[] => {
    const out: TExoMachineField<TExoStateTableState, TValue>[] = new Array<
        TExoMachineField<TExoStateTableState, TValue>
    >(count);
    for (let f = 0; f < count; f++) out[f] = exoStateTableField<TValue>(f, base);
    return out;
};

/**
 * ONE COMPONENT, ITS PROGRAM AND ITS TRANSITIONS — everything a driver needs, and the base a census
 * prints.
 *
 * `ops` and `base` are FUNCTIONS because variant 3 does not know its base until its first wire. For
 * variant 2 both are settled at module load and the accessor is a formality.
 */
export interface TExoStateTablePack<THandle, TOps> {
    readonly component: TExoDomMachine;
    /**
     * THE HANDLES THIS COMPONENT'S ROWS READ, BY INDEX. A wire is handed its POSITION and nothing
     * else, so the handle a row seeds itself from is looked up here. Assign UNTIMED, immediately
     * before the render that mounts the rows; a row reads `handles[index]` inside its mount, which
     * is the same one array load every other participant's row pays.
     */
    readonly setHandles: (handles: readonly THandle[]) => void;
    /** The transitions. Available after the first render; refuses before it. */
    readonly ops: () => TOps;
    /** Where field 0 lives: 0 for variant 2, the schema's node-slot count for variant 3. */
    readonly base: () => number;
    /** How many slots the state occupies. Printed beside the base. */
    readonly fields: number;
    /** `true` for variant 3. Printed, so a census cannot mislabel a row. */
    readonly shared: boolean;
}

export interface TExoStateTableSpec<TPorts, THandle, TOps> {
    /** `false` = variant 2 (its own array). `true` = variant 3 (the instance's node array). */
    readonly sharedWithNodes: boolean;
    /** How many state fields — the number the shipped compiler checks every declaration against. */
    readonly fields: number;
    /** The SAME schema cursor every other participant uses, so the markup is byte-identical. */
    readonly build: (b: TExoSchemaCursor) => TPorts;
    /**
     * THE DERIVATIONS, declared against fields built at `base`. Called ONCE per component — at
     * module load for variant 2, at the first wire for variant 3.
     */
    readonly declare: (
        ports: TPorts,
        base: number
    ) => readonly TExoMachineDerivation<TExoStateTableState>[];
    /** THE TRANSITIONS, declared once beside the program, with the base as a closed-over constant. */
    readonly makeOps: (base: number, program: TExoMachineProgram<TExoStateTableState>) => TOps;
    /**
     * VARIANT 2's SEEDING — ONE ARRAY LITERAL, built whole. Growing an array field by field would
     * size its backing store by accident, and this repository has measured what growing a value
     * instead of building it whole costs.
     *
     * IT RETURNS `fields + 1` ENTRIES AND THE LAST ONE IS `0`: the pending word rides in the same
     * array, in the slot after the fields, so this variant allocates one array and not two. A
     * literal one entry short would put the pending word in a hole.
     */
    readonly seedWhole: (handle: THandle) => unknown[];
    /**
     * VARIANT 3's SEEDING — ONE VALUE AT A TIME, because there is no literal to build: the array
     * already exists and holds this instance's nodes. The wire calls this for `f = 0 .. fields - 1`
     * IN ASCENDING ORDER, which is what keeps the array packed. See the header.
     */
    readonly seedField: (handle: THandle, f: number) => unknown;
    /** Write the instance back onto the handle, so an untimed driver can reach it afterwards. */
    readonly take: (handle: THandle, state: TExoStateTableState) => void;
    /**
     * THE EVENT PORTS, if the component has any — `null` for a component with none.
     *
     * IT IS HANDED THE OPS, because a handler needs a transition and a shared-table component's
     * transitions are not declared until its first wire. That is one argument more than the
     * connector and the ports, and it is what lets a handler be `() => ops.toggle(state)` — one
     * closure per instance, which is exactly what every other participant's click costs.
     */
    readonly onWired:
        | ((c: TExoWiredWiring, ports: TPorts, state: TExoStateTableState, ops: TOps) => void)
        | null;
}

/**
 * BUILD ONE TABLE-BACKED COMPONENT — variant 2 or variant 3, chosen by one flag, because the two
 * differ in exactly two statements and nothing else.
 *
 * ═══ WHY THERE ARE TWO WIRE BODIES AND NOT ONE WITH A BRANCH ═══
 *
 * Variant 2's base is 0 and is known at module load, so its program, its fields and its transitions
 * are all built in the WIRE FACTORY — exactly where the shipped `C` builds its own — and its wire
 * carries no test of any kind. Variant 3 cannot: the length of the instance's node table (`c.nodes`)
 * is a property of a compiled schema and no schema exists until the first render. Its wire
 * therefore carries ONE null comparison per instance, and writing the two bodies separately is what
 * keeps variant 2 from paying for it.
 */
export function exoStateTablePack<TPorts, THandle, TOps>(
    spec: TExoStateTableSpec<TPorts, THandle, TOps>
): TExoStateTablePack<THandle, TOps> {
    const fields = spec.fields;
    const onWired = spec.onWired;
    let base = -1;
    let ops: TOps | null = null;
    let handles: readonly THandle[] = [];

    const schema = createExoSchema(spec.build);
    const P = schema.ports;
    const initialState = (): TExoMachineInitialState<TExoDomNode> => {
        const compile = (at: number): TExoMachineProgram<TExoStateTableState> =>
            compileExoMachine<TExoStateTableState>({
                fields: fields,
                // THE SLOT AFTER THE FIELDS, in the same array they live in.
                pendingRow: at + fields,
                derivations: spec.declare(P, at),
            });

        if (!spec.sharedWithNodes) {
            // ── VARIANT 2 — ITS OWN ARRAY, NUMBERED FROM ZERO ───────────────────────────────
            base = 0;
            const program = compile(0);
            const mine = spec.makeOps(0, program);
            ops = mine;
            return (c, index) => {
                const handle = handles[index];
                // TWO ALLOCATIONS PER INSTANCE, and that is the shape's price: the state object,
                // and the array of values it points at. Both are built WHOLE — the array by the
                // caller's literal, the object by this one.
                const state: TExoStateTableState = {
                    managedState: spec.seedWhole(handle),
                    portTable: c.portTable(),
                    portWrite: c.portNodeWriter(),
                    attr: exoDetachedWrite,
                    text: exoDetachedWrite,
                    unsafeHtml: exoDetachedWrite,
                };
                spec.take(handle, state);
                fillExoMachineDerivations(program, state);
                if (onWired !== null) onWired(c, P, state, mine);
            };
        }

        // ── VARIANT 3 — THE INSTANCE'S NODE ARRAY, ONE NUMBERING FOR NODES AND STATE ────────
        let program: TExoMachineProgram<TExoStateTableState> | null = null;
        let mine: TOps | null = null;
        return (c, index) => {
            const handle = handles[index];
            // THE NODE TABLE ITSELF. `wireExoInstance` built it as `[root]` and appended one entry
            // per walk landing before calling this, so its length here is the schema's node-slot
            // count and is the same number for every instance of this component.
            //
            // A WIRE IS HANDED THE INSTANCE'S OWN RECORD, and the node table is a field of it, so
            // this is one property load and not a cost this variant invents.
            const cells = c.nodes as unknown as unknown[];
            // READ INTO A LOCAL so the compiler can narrow it — a `let` from an enclosing scope
            // stays `| null` at every use, and this is one load per instance mount, not a check.
            let prog = program;
            if (prog === null) {
                base = cells.length;
                prog = compile(base);
                program = prog;
                mine = spec.makeOps(base, prog);
                ops = mine;
            }
            // APPENDED IN ASCENDING SLOT ORDER, which is what keeps the array PACKED. Each store
            // lands at `cells.length` and extends it by one; a store out of order would punch a
            // hole and make every port write of every instance carry a holey-load check. The
            // PENDING WORD is the last append, in the slot `compile` numbered for it.
            for (let f = 0; f < fields; f++) cells[base + f] = spec.seedField(handle, f);
            cells[base + fields] = 0;
            // ONE ALLOCATION PER INSTANCE. `state` and `portTable` are the same array —
            // that identity is checked structurally by the axis, not asserted here.
            const state: TExoStateTableState = {
                managedState: cells,
                portTable: c.portTable(),
                portWrite: c.portNodeWriter(),
                attr: exoDetachedWrite,
                text: exoDetachedWrite,
                unsafeHtml: exoDetachedWrite,
            };
            spec.take(handle, state);
            fillExoMachineDerivations(prog, state);
            if (onWired !== null) onWired(c, P, state, mine as TOps);
        };
    };
    const machine = createExoMachineBuilder<TExoDomNode>(schema);
    machine.createInitialState(initialState());
    const component = machine.done();

    return {
        component,
        setHandles: (rows: readonly THandle[]): void => {
            handles = rows;
        },
        ops: (): TOps => {
            if (ops === null) {
                throw new Error(
                    'machine-state-shapes: the transitions of a shared-table component are declared ' +
                        'at its FIRST WIRE, and nothing has rendered this component yet. A driver ' +
                        'assembled before the mount would be holding no transitions at all.'
                );
            }
            return ops;
        },
        base: (): number => base,
        fields,
        shared: spec.sharedWithNodes,
    };
}
