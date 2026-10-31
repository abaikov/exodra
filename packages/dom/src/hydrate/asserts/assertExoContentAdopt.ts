import type { TExoDomSetter } from '../../dom/types/TExoDomSetter';

// Only for a children port that SHARES its element. A port that is its element's only child takes
// raw markup through `html`, and on a hydrating page that fill is a REPAIRING one: it compares what
// the server printed against what the fill was handed, through the same parser, and writes only on
// disagreement — writing unconditionally would tear down a correct subtree and the listeners just
// attached inside it.
// It names no tag, unlike `dom/assert-content-set`: this port has no element of its own, so the only
// tag reachable here would be the wrong one.
// The development message is split at the SAME place as `dom/assert-content-set`'s, so that one
// refused program is described one way wherever a developer meets it.
export const assertExoContentAdopt: TExoDomSetter = () => {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? 'createExoSchema(hydrate): this children port cannot be filled with set() — it shares ' +
              'its element with other children.' +
              ' The only way to write raw markup is innerHTML, which would destroy them. Nested ' +
              'instances go through one(), list() or childList(); raw markup (unsafeHtml) needs ' +
              "a port that is its element's ONLY child. The server and a client render refuse " +
              'this same program, by design.'
            : 'EXO0033'
    );
};
