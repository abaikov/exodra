// A generated name grows an underscore until it cannot collide. COLLISION IS CHECKED BY PREFIX and
// not by equality, because most of these names are numbered: `_h` is safe only if nothing is called
// `_h0` or `_h7` either, and the numbers do not exist when the base is chosen. Babel's
// `generateUid` resolves against PROGRAM scope, which cannot see the function-local binding that is
// exactly the shadow breaking a wiring function.
export function pickName(taken: ReadonlySet<string>, base: string): string {
    let candidate = base;
    let clashes = true;
    while (clashes) {
        clashes = false;
        for (const name of taken) {
            if (name.startsWith(candidate)) {
                clashes = true;
                break;
            }
        }
        if (clashes) candidate += '_';
    }
    return candidate;
}
