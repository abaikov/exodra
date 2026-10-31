// THE PROPOSED WIRE-SHAPED DERIVATION API, BUILT OUT OF THE SHIPPED MACHINE AND NOTHING ELSE.
//
// ═══ CORE NOW SHIPS THIS SHAPE, AND THAT IS SAID FIRST BECAUSE EVERYTHING BELOW PREDATES IT ═══
//
// `exoWiring` / `ExoWiringBlock` in `@exodra/computed` are the per-instance block this file
// was written to prototype: `w.field(seed)`, `w.derive(target, from, by)`, `w.fill`, `w.effect`,
// `w.transition`, declared INSIDE a wire, compiled once by the first instance, with a per-instance
// program whose `computes` array holds the author's closures. THIS FILE IS NOT THAT — it keeps the
// trampoline arrangement described below, so `exodraInline` still measures the row it was recorded
// against. Whether the row should be re-pointed at `exoWiring` is a decision for whoever owns the
// axis; it would change what the row measures and every recording it is compared with.
//
// ═══ WHAT IS BEING PROPOSED, IN THE OWNER'S OWN SPELLING ═══
//
//     c.computed(P.label, [name, open], (n, o) => (o ? n : n.slice(0, 3)));
//
// A derivation declared WHERE THE INSTANCE IS WIRED, not in a spec compiled once per component. The
// dependencies are the same field handles `exoMachineField` already hands out, the target is the
// same port, and the value goes to the same place. THE ONE DIFFERENCE IS THAT THE COMPUTE FUNCTION
// IS A CLOSURE PER INSTANCE INSTEAD OF ONE SHARED PER COMPONENT — on 80 cards with five derived
// values that is 400 closures and 80 arrays the machine does not allocate.
//
// `apps/exodra/exodra.tsx` is the row that runs this against `exodraMachine` on two axes.
//
// ═══ WHAT IS SHIPPED AND WHAT IS MINE — THE WHOLE POINT OF THE ARRANGEMENT ═══
//
// EVERYTHING THAT DISPATCHES IS IMPORTED FROM `@exodra/core` AND CALLED UNCHANGED. Nothing in this
// file re-spells a commit, a mask, a bit walk or a port write, because a re-spelling would be what
// the axis measured:
//
//   the compile         `compileExoMachine` — the field→slot table, the masks, the port indexes,
//                       the topological check, the bound-reads specialisation.
//   the initial fill    `fillExoMachineDerivations` — every derivation once, in slot order.
//   the commit          `commitExoMachine`, reached the only way an author reaches it: through
//                       `exoTransition`, which the participant calls directly. Its `settle`, its
//                       bit walk and its port write are the shipped ones, byte for byte.
//
// WHAT THIS FILE ADDS IS THREE THINGS AND THEY ARE ALL DECLARATION-TIME:
//
//   1. A per-component SITE that records the first instance's declarations and compiles them once.
//   2. A per-instance ARRAY of the author's compute closures, in declaration order.
//   3. One shared TRAMPOLINE per slot, compiled into the program in place of the author's function,
//      which fetches that instance's closure and calls it with the values the program read.
//
// ═══ WHY A TRAMPOLINE AND NOT A PER-INSTANCE PROGRAM, WHICH WAS THE OTHER OFFER ═══
//
// A per-instance program object (the shipped program's arrays shared by reference, with its own
// `computes`) would also work, and it would put the wrapper's whole cost in ALLOCATION — one
// 13-slot object per card, plus TWO transitions per card, because `exoTransition` resolves its
// program EAGERLY at declaration time (`exoTransition.ts`: `'program' in of ? … : of`) and could
// no longer be shared. That is four closures and an object per card added to a row whose entire
// question is five closures per card: the wrapper would be the same size as the effect. It is also
// exactly what `ExoWiringBlock` does, which is the shipped answer to the same question.
//
// THE TRAMPOLINE PAYS IN INDIRECTION INSTEAD, AND LEAVES THE ALLOCATION PROFILE EXACTLY AS THE
// PROPOSAL DESCRIBES IT. Per derivation RUN it costs one identity read, one array load and one
// extra call frame that neither real form would pay. That is the honest wrapper tax and it belongs
// in the caption; it is stated again in `participants/exodra/inline.tsx`, where it is put beside
// the number of derivation runs a sample makes.
//
// ═══ THE SELF-READ, WHICH IS THE ONE UGLY PART AND IS NOT HIDDEN ═══
//
// `bindExoMachineReads(reads, compute)` calls the compute with THE READ VALUES AND NOTHING ELSE —
// the enode is not passed to a derivation, on purpose, because a derivation is pure in what it
// declares. A trampoline therefore cannot reach the instance it is running for unless the instance
// is one of the values it read. So the site declares ONE EXTRA FIELD whose reader is the identity
// (`(s) => s`) and prepends it to every derivation's reads.
//
// WHAT THAT DOES AND DOES NOT CHANGE, checked against `compileExoMachine.ts`:
//   * `fieldMarks` for the AUTHOR's fields is untouched — a mark is the set of slots that read that
//     field, and the author's reads are declared unchanged, so `open` wakes exactly the slots it
//     wakes under `exodraMachine`. The participant prints both rows' marks to show it.
//   * the extra field's own mark is every slot, and NOTHING EVER WRITES IT, so no transition can
//     OR it into the pending word and no commit can be woken by it.
//   * each derivation's `reads` mask carries one extra bit. That word is written by the compile and
//     read by the slot runner; this component declares no body.
//   * the bound-reads specialisation moves up one arity (a two-field derivation takes the
//     three-argument path). Every field here reads through a closure rather than a state row, so
//     both paths are the closure path in the same function.
//
// A REAL `c.computed` WOULD NEED NONE OF THIS: the commit would fetch the instance's own compute
// where it today fetches `program.computes[i]`, one field load either way. The self-read exists so
// that nothing in `packages/core` had to change for this measurement, and it can only make the new
// row look DEARER — never cheaper — which is the direction that keeps the reading safe.
//
// ═══ THE STATE IS THE AUTHOR'S OBJECT AND IT ANSWERS THE ENODE CONTRACT ITSELF ═══
//
// `TExoCommitNode` is two members: `state`, the numbered slot table the pending word lives in, and
// `set`, the door a derivation's value leaves by. This file's state carries both. The pending word
// is row 0 of a one-slot array — where the shipped `ExoWiringBlock` also puts it — and `set` is ONE
// SHARED FUNCTION assigned by reference, so no instance allocates a forwarder: it writes through the
// `(table, port, value)` pair `c.portNodeWriter()` hands out, which is the shipped write, exactly
// as the commit reached the DOM before the enode and the instance became one object.
import { type TExoPort, type TExoPortNodeWriter, type TExoPortTable } from '@exodra/core';
import {
    compileExoMachine,
    exoMachineField,
    fillExoMachineDerivations,
    type TExoCommitNode,
    type TExoMachineDerivation,
    type TExoMachineField,
    type TExoMachineProgram,
} from '@exodra/computed';

/** Row zero of an inline instance's slot table is its pending word; it declares no other row. */
export const EXO_INLINE_PENDING_ROW = 0;

/** One author-written compute. The parameters are `never` for the reason core's own derivation type
 *  uses them: every concrete signature is assignable to it, and the call site below re-types it. */
export type TExoInlineCompute = (...values: never[]) => unknown;

/**
 * WHAT AN INSTANCE HOLDS THAT `exodraMachine`'S DOES NOT: the array of its own compute closures, in
 * declaration order. Everything else is what the enode contract asks for — the one-slot table
 * holding the pending word, and the write door.
 *
 * IT IS A PLAIN PACKED ARRAY GROWN BY `push` and not `new Array(n)`: a preallocated array is HOLEY
 * until every slot is written and a holey load is not a packed load, and the count is not known on
 * the first instance anyway. `push` is also what makes the slot number BE the declaration order,
 * with no cursor field on the state to keep in step with it.
 */
export interface TExoInlineState extends TExoCommitNode {
    readonly exoInlineComputes: TExoInlineCompute[];
    readonly portTable: TExoPortTable;
    readonly portWrite: TExoPortNodeWriter;
}

/**
 * THE WRITE DOOR, SHARED BY EVERY INSTANCE — assigned into the state literal by reference, so a card
 * allocates nothing for it. It is the door's line without the fill record, which is what the pair
 * `c.portTable()` / `c.portNodeWriter()` exists to give a driver that makes its own record.
 */
export function exoInlineWrite(this: TExoInlineState, port: TExoPort, value: unknown): void {
    this.portWrite(this.portTable, port, value);
}

/**
 * THE ARGUMENT LIST A COMPUTE IS CALLED WITH, derived from the fields it declared — so swapping two
 * dependencies is a COMPILE ERROR and not a value that is quietly wrong on the screen. Same mapped
 * type as core's `TExoMachineReads`, which is what `exoComputed`'s overloads exist to provide; the
 * inline form gets it by inference instead of by four hand-written arities.
 */
export type TExoInlineReads<TState, TFrom extends readonly TExoMachineField<TState, unknown>[]> = {
    -readonly [TAt in keyof TFrom]: TFrom[TAt] extends TExoMachineField<TState, infer TValue>
        ? TValue
        : never;
};

/**
 * ONE COMPONENT'S DECLARATION TABLE. On a connector this would hang off the compiled schema, which
 * is per component already; here it is a value the wire closes over, which is the same lifetime.
 *
 * `program` is `null` until the FIRST instance has declared everything and armed. That is the whole
 * of the caching: the first card records and compiles, every card after it only pushes closures.
 */
export interface TExoInlineSite<TState extends TExoInlineState> {
    program: TExoMachineProgram<TState> | null;
    /** Author fields plus the one self-read the trampolines need. */
    readonly fields: number;
    readonly self: TExoMachineField<TState, TState>;
    readonly declared: TExoMachineDerivation<TState>[];
}

/**
 * OPEN A COMPONENT'S TABLE — called once, in the wire factory, beside where a machine component
 * would call `compileExoMachine`. `fields` is the author's field count; the self-read takes the
 * next index after them.
 */
export function exoInlineSite<TState extends TExoInlineState>(
    fields: number
): TExoInlineSite<TState> {
    return {
        program: null,
        fields: fields + 1,
        self: exoMachineField<TState, TState>(fields, (s) => s),
        declared: [],
    };
}

/**
 * ONE SLOT'S TRAMPOLINE — shared by every instance, compiled into the program in place of the
 * author's function. Specialised by arity so the call it makes is a direct call with the arguments
 * the bound reads already produced, never an `apply` over a scratch array.
 */
function exoInlineTrampoline(slot: number, arity: number): TExoInlineCompute {
    type TState = TExoInlineState;
    switch (arity) {
        case 0:
            return ((s: TState): unknown =>
                (s.exoInlineComputes[slot] as () => unknown)()) as TExoInlineCompute;
        case 1:
            return ((s: TState, a: unknown): unknown =>
                (s.exoInlineComputes[slot] as (a: unknown) => unknown)(a)) as TExoInlineCompute;
        case 2:
            return ((s: TState, a: unknown, b: unknown): unknown =>
                (s.exoInlineComputes[slot] as (a: unknown, b: unknown) => unknown)(
                    a,
                    b
                )) as TExoInlineCompute;
        default:
            return ((s: TState, ...values: unknown[]): unknown =>
                (s.exoInlineComputes[slot] as (...values: unknown[]) => unknown)(
                    ...values
                )) as TExoInlineCompute;
    }
}

/**
 * DECLARE A DERIVED VALUE, INSIDE THE WIRE — the call the proposal is about.
 *
 * On a connector this is `c.computed(port, reads, compute)`: `site` is the component's table, which
 * a connector reaches through its schema, and `state` is the instance, which a connector holds.
 * Both are already in the connector's hand, so the free-function spelling here costs the same call
 * with two more argument stores and nothing else.
 *
 * PER INSTANCE, PER CALL: one `push` and one null test. On the FIRST instance only, the reads and
 * the port are recorded and a trampoline is made.
 *
 * THE `reads` ARRAY IS ALLOCATED BY THE CALLER, EVERY TIME, and that allocation is the proposal's
 * and not the wrapper's — `[name, open]` is an array literal in the author's wire whether the
 * callee keeps it or not. Only the first instance ever reads it. The participant's census counts it.
 */
// `const` ON THE TYPE PARAMETER, AND IT IS LOAD-BEARING. Without it TypeScript infers `TFrom` from
// `[F_TITLE, F_OPEN]` as an ARRAY of the union — `Field<string> | Field<boolean>` — so the mapped
// type below produces `(string | boolean)[]` and every parameter of `compute` arrives as the union.
// `const` preserves the literal tuple, so position 0 is `string` and position 1 is `boolean`, which
// is the whole point of dependencies-as-arguments: a compute cannot read a field it did not declare,
// and cannot read one it did declare at the wrong type.
export function exoInlineComputed<
    TState extends TExoInlineState,
    const TFrom extends readonly TExoMachineField<TState, unknown>[]
>(
    site: TExoInlineSite<TState>,
    state: TState,
    port: TExoPort,
    reads: TFrom,
    compute: (...values: TExoInlineReads<TState, TFrom>) => unknown
): void {
    const slot = state.exoInlineComputes.length;
    state.exoInlineComputes.push(compute as TExoInlineCompute);
    if (site.program !== null) return;
    if (slot !== site.declared.length) {
        // A SECOND INSTANCE THAT DECLARED A DIFFERENT NUMBER OF VALUES BEFORE THE FIRST ONE
        // FINISHED. The slot number IS the declaration order, so a table built from a conditional
        // declaration would put one card's headline in another card's port. Refused here rather
        // than compiled: this is the one thing the inline form can get wrong that a spec cannot.
        throw new Error(
            `exoInlineComputed: slot ${slot} declared where ${site.declared.length} was expected. ` +
                'Every instance of a component must declare the same derived values in the same ' +
                'order; a conditional `computed` has no compiled table to belong to.'
        );
    }
    site.declared.push({
        label: `inline slot ${slot}`,
        // THE SELF-READ FIRST, THE AUTHOR'S READS UNCHANGED AFTER IT. See the header.
        reads: [site.self, ...reads],
        into: port,
        // `exoComputed` IS NOT USED HERE, and the reason is worth one line: it is the identity
        // function at runtime and exists purely to check a compute's arity against a literal tuple
        // of fields. The inline form does that check at the call site above, on the author's own
        // arguments, where the tuple is still known — by the time the declaration is recorded the
        // arity has been erased into a trampoline.
        compute: exoInlineTrampoline(slot, reads.length),
    });
}

/**
 * COMPILE ON THE FIRST INSTANCE, THEN FILL THIS ONE — the end of the declaration block, and the
 * point where the ports first reach the DOM.
 *
 * Per instance: one null test and the SHIPPED `fillExoMachineDerivations`, so nothing this wire
 * does at the mount is cheaper than the shipped path. On the first instance IN THE PROCESS — the site outlives every mount — the SHIPPED
 * `compileExoMachine` as well. On both axes that first mount is the markup gate's, which runs
 * before any clock starts, so no timed sample compiles anything; the participant's header declares
 * that rather than leaving it to be noticed, because it is a point in this row's favour.
 */
export function exoInlineArm<TState extends TExoInlineState>(
    site: TExoInlineSite<TState>,
    state: TState
): TExoMachineProgram<TState> {
    let program = site.program;
    if (program === null) {
        program = compileExoMachine<TState>({
            fields: site.fields,
            pendingRow: EXO_INLINE_PENDING_ROW,
            derivations: site.declared,
        });
        site.program = program;
    }
    fillExoMachineDerivations(program, state);
    return program;
}

// THE TRANSITION IS NOT WRAPPED AND NOT RE-EXPORTED FROM HERE. `apps/exodra/exodra.tsx`
// imports `exoTransition` from `@exodra/computed` itself, on the same line
// `apps/exodra/exodra.tsx` imports it,
// and hands it THE SHARED PROGRAM this file compiled — so the transition, its `settle` and the
// commit behind it are the shipped path with nothing of mine in front of them.
