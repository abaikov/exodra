import { describeExoNode } from '../dom/describeExoNode';
import { exoDomSchemaOf } from '../dom/exoDomSchemaOf';
import { EXO_WALK_FIRST_CHILD } from '../dom/constants/EXO_WALK_FIRST_CHILD';
import { EXO_WALK_FROM_END } from '../dom/constants/EXO_WALK_FROM_END';
import { EXO_WALK_NEXT_SIBLING } from '../dom/constants/EXO_WALK_NEXT_SIBLING';
import type { TExoMachine } from '@exodra/core';
import type { TExoDomApi } from '../dom/types/TExoDomApi';

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

/** Hydration inspects no node of its own accord — it trusts that a schema's string and DOM
 * backends compile the same markup, and this comparison is separate and asked for by name. Shape
 * only, never values; returns the disagreement rather than throwing. See `packages/dom/README.md`. */
export function findExoRowDisagreement(
    machine: TExoMachine<never>,
    root: Element,
    /** Must be the backend the PAGE renders through: `machine.forms` is indexed by its
     * `backendType`, so any other backend compiles a second schema — cost only, same result. */
    backend: TExoDomApi
): string | null {
    const schema = exoDomSchemaOf(machine, backend);
    // The HYDRATION walk, not the render walk: served child-list rows fill a gap the prototype
    // leaves empty, so the render walk would report a correct row as a mismatch.
    const walk = schema.hydrateWalk;
    const slots = schema.slots;

    // No entry can be missing: `compileExoDomSchema` throws for a walk that runs off its prototype.
    const wanted = schema.protoLandings;
    const found: Node[] = new Array(slots);
    found[0] = root;
    const rootProblem = disagree(root, schema.proto);
    if (rootProblem !== null) return `the row's root is ${rootProblem}`;

    for (let i = 0; i < walk.length; i += 3) {
        const op = walk[i + 2];
        const fromFound = found[walk[i + 1]];
        const nextWanted = wanted[walk[i]];
        const nextFound = hop(fromFound, op);
        if (nextFound === null) {
            // A text port the server rendered EMPTY has no Text node, so this is a correct page.
            // Leaving `found` unwritten is safe: text triples are last, nothing hops onward.
            if (nextWanted.nodeType === TEXT_NODE) continue;
            return (
                `the markup ran out of nodes where the schema has ${describeExoNode(nextWanted)}` +
                where(op)
            );
        }
        const problem = disagree(nextFound, nextWanted);
        if (problem !== null) {
            return `expected ${describeExoNode(nextWanted)} here, found ${problem}`;
        }
        found[walk[i]] = nextFound;
    }
    return null;
}

function hop(from: Node, op: number): Node | null {
    if (op === EXO_WALK_FIRST_CHILD) return from.firstChild;
    if (op === EXO_WALK_NEXT_SIBLING) return from.nextSibling;
    let landed: Node | null = from.lastChild;
    for (let back = op - EXO_WALK_FROM_END; back > 0 && landed !== null; back--) {
        landed = landed.previousSibling;
    }
    return landed;
}

function where(op: number): string {
    if (op === EXO_WALK_FIRST_CHILD) return ' as a first child';
    if (op === EXO_WALK_NEXT_SIBLING) return ' as a next sibling';
    return ' counting back from the last child';
}

/** Text compares by EXISTENCE only: the prototype holds a placeholder where the server wrote a
 * value, so comparing content would report the page's own data as a defect. */
function disagree(found: Node, wanted: Node): string | null {
    if (found.nodeType !== wanted.nodeType) return describeExoNode(found);
    if (found.nodeType !== ELEMENT_NODE) return null;
    const a = (found as Element).tagName;
    const b = (wanted as Element).tagName;
    return a === b ? null : describeExoNode(found);
}
