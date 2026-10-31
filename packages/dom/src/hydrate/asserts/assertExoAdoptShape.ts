// Reached once per position of a HYDRATED `bindChildren` only. `problem` is `findExoRowDisagreement`'s
// own "expected <span>, found <b>", which is a sentence rather than a name and so stays in the
// development message. Why a disagreeing element is refused rather than repaired: README.md § Why a
// shape disagreement is refused.
export function assertExoAdoptShape(position: number, problem: string): never {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `Exodra hydration: the server's markup at position ${position} of a children ` +
              `port is not what this child was built from — ${problem}.` +
              ' The walk that wires an instance is compiled against the schema and inspects ' +
              'nothing, so it cannot be aimed at a different element. Either the page was served ' +
              'by a different build than the one running here, or the wiring function assembles ' +
              'its children in a different order from the one it places them in — a hydrating ' +
              "`build` takes the server's elements in document order."
            : 'EXO0034'
    );
}
