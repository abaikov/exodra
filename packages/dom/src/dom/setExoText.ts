import type { TExoDomSetter } from './types/TExoDomSetter';

// Handed the Text NODE, not the element: the declaration under the body is what the compiler reads.
// Writing `''` KEEPS that node, because an empty Text node serialises to nothing, which is what the
// server prints for an unfilled port.
// It does NOT recover when something on the page replaces the node — that recovery is composed
// (`exoReclaimingText`, restored by `withExoDefaults()`), not deleted.
export const setExoText: TExoDomSetter = (node, value) => {
    (node as unknown as Text).data = value == null ? '' : String(value);
};

// The declaration, on the line under the body it is true of.
setExoText.takesTextNode = true;
