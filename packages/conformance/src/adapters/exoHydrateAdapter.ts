import {
    ExoDomBackend,
    exoDomSchemaOf,
    withExoChildList,
    withExoForeignNamespaces,
    withExoHydration,
    withExoCompiler,
} from '@exodra/dom';
import { ExoStrBackend, exoStrSchemaOf } from '@exodra/string';
import { EXO_CAP_ELEMENT } from '../constants/EXO_CAP_ELEMENT';
import { EXO_CAP_LIVE_TREE } from '../constants/EXO_CAP_LIVE_TREE';
import { EXO_CAP_TEXT_NODE } from '../constants/EXO_CAP_TEXT_NODE';
import { EXO_CAP_UPDATE } from '../constants/EXO_CAP_UPDATE';
import { exoSketchOfChildren } from '../exoSketchOfElement';
import { translateFirstExoText } from '../translateFirstExoText';
import type {
    TExoConformanceAdapter,
    TExoConformanceMachine,
} from '../types/TExoConformanceAdapter';

// Built once each: a schema is cached per (declaration, backend), compared by POINTER. The DOM
// half must be the shipped default plus `withExoHydration` and nothing else, or a divergence this
// suite records belongs to the composition rather than to adoption.
const EXO_STR = /*#__PURE__*/ new ExoStrBackend();
const EXO_HYDRATE = /*#__PURE__*/ withExoHydration(
    withExoChildList(withExoForeignNamespaces(withExoCompiler(new ExoDomBackend())))
);

// `@exodra/string`'s bytes, parsed, then adopted by a DOM backend. `hydrate` adopts
// `parent.firstElementChild` and nothing else, so this refuses `n > 1` rather than leave `n - 1`
// unadopted elements in the artefact. README: `compile` cannot reach the hydrate schema's own
// refusals, and `set()` writes nothing on this path.
export const exoHydrateAdapter: TExoConformanceAdapter = {
    name: 'hydrate',
    pkg: '@exodra/dom (hydrate)',
    can: new Set([EXO_CAP_ELEMENT, EXO_CAP_UPDATE, EXO_CAP_LIVE_TREE, EXO_CAP_TEXT_NODE]),

    compile(machine: TExoConformanceMachine): void {
        exoStrSchemaOf(machine, EXO_STR);
        exoDomSchemaOf(machine, EXO_HYDRATE);
    },

    render(machine: TExoConformanceMachine, n: number) {
        if (n !== 1) {
            throw new Error(
                `exoHydrateAdapter: asked for ${n} instances, and hydration adopts exactly one — ` +
                    'see the header above. A rule that needs several must first say what it ' +
                    'expects the adopted tree to be when the server sent more instances than one ' +
                    'hydrate call can claim.'
            );
        }
        const markup = EXO_STR.render(machine);
        const parent = document.createElement('div');
        document.body.appendChild(parent);

        // NOT `parent.innerHTML = markup`: a `<template>`'s own insertion mode keeps a fragment
        // beginning with `<li>`, `<tr>` or `<option>` from being dropped or foster-parented, and
        // `exoSketchOfMarkup` parses the same bytes the same way — the two sides of a
        // server/client rule must meet the SAME parser. Appending moves already-parsed nodes.
        const holder = document.createElement('template');
        holder.innerHTML = markup;
        parent.appendChild(holder.content);

        const dispose = EXO_HYDRATE.hydrate(machine, parent);
        return {
            sketch: (probe: readonly string[]): string => exoSketchOfChildren(parent, probe),
            fire: (type: string): void => {
                const root = parent.firstElementChild;
                if (root === null) {
                    throw new Error('exoHydrateAdapter: nothing was adopted to fire at');
                }
                root.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
            },
            translate: (): void => translateFirstExoText(parent),
            dispose,
        };
    },
};
