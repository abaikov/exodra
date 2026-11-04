import { EXO_PORT_CHILDREN, EXO_PORT_EVENT, EXO_PORT_REF, EXO_PORT_TEXT } from '@exodra/core';
import type { TExoAnyPort } from '@exodra/core';

// The one shape adoption gives up on: a PORT on a static standing BETWEEN two children ports.
// Refused in the HYDRATE schema and not in `compileExoDomSchema`, so a page that renders such a
// component and never hydrates is untouched. Why the child list behind that static is fine while a
// port on it is not: ../../README.md § Adoption between child lists.
export function assertReachableExoPorts(
    portList: readonly TExoAnyPort[],
    // `[start, end)` slot ranges the hydration walk cannot resolve.
    unreachable: readonly number[],
    // By port index: the slot holding the element the port belongs to — the DOM schema's.
    elem: readonly number[]
): void {
    if (unreachable.length === 0) return;
    for (let i = 0; i < portList.length; i++) {
        const slot = elem[i];
        for (let b = 0; b < unreachable.length; b += 2) {
            if (slot < unreachable[b] || slot >= unreachable[b + 1]) continue;
            throw new Error(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `exoHydrate: ${describePort(portList[i], i)} stands on a static element ` +
                      'BETWEEN two children ports, and hydration cannot find that element. ' +
                      'Give one of the two child lists its own element, or move this port off ' +
                      'the separator.' +
                      " In <h3/>{a}<hr/>{b}<footer/> the <hr> is short by child list a's rows " +
                      "counted forward and by child list b's rows counted back, so this port would " +
                      "be wired onto one of a's list rows with nothing in the markup to show " +
                      'it. The child list BEHIND such a static is recovered from the one in FRONT ' +
                      'of it when that one adopts; a port on the static itself cannot be, ' +
                      'because a wiring function is free to fill it first. (A client render of ' +
                      'this schema is unaffected — only adoption is refused.)'
                    : 'EXO0029'
            );
        }
    }
}

// Called on the throw path only, so nothing is built for a schema that passes.
function describePort(port: TExoAnyPort, index: number): string {
    if (port.kind === EXO_PORT_EVENT) return `the event port "${String(port.name)}" (${index})`;
    if (port.kind === EXO_PORT_CHILDREN) return `the children port ${index}`;
    // A REF port is refused too though it writes nothing: it hands the WIRE an element, and here
    // that element is one of the front child list's rows.
    if (port.kind === EXO_PORT_REF) return `the ref port ${index}`;
    if (port.kind === EXO_PORT_TEXT) return `the text port ${index}`;
    // The three attribute kinds fall through together, so a fourth one is named rather than
    // described as something it is not.
    return `the attribute port "${String(port.name)}" (${index})`;
}
