import {
    ExoDomBackend,
    exoDomSchemaOf,
    withExoCompiler,
    withExoForeignNamespaces,
} from '@exodra/dom';
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

// The backend IS the schema cache key and is compared by POINTER, so `compile` and `render` must
// hold the SAME object or they work on two different compiled schemas.
const EXO_DOM = /*#__PURE__*/ withExoForeignNamespaces(withExoCompiler(new ExoDomBackend()));

export const exoDomAdapter: TExoConformanceAdapter = {
    name: 'dom',
    pkg: '@exodra/dom',
    can: new Set([EXO_CAP_ELEMENT, EXO_CAP_UPDATE, EXO_CAP_LIVE_TREE, EXO_CAP_TEXT_NODE]),

    compile(machine: TExoConformanceMachine): void {
        exoDomSchemaOf(machine, EXO_DOM);
    },

    render(machine: TExoConformanceMachine, n: number) {
        // The container must be IN the document: a delegated listener is attached at `document`,
        // so an event fired into a detached tree reaches nothing.
        const parent = document.createElement('div');
        document.body.appendChild(parent);
        const disposers: (() => void)[] = [];
        for (let i = 0; i < n; i++) disposers.push(EXO_DOM.render(machine, parent));
        const dispose = (): void => {
            for (let i = 0; i < disposers.length; i++) disposers[i]();
        };
        return {
            sketch: (probe: readonly string[]): string => exoSketchOfChildren(parent, probe),
            fire: (type: string): void => {
                const root = parent.firstElementChild;
                if (root === null)
                    throw new Error('exoDomAdapter: nothing was rendered to fire at');
                root.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
            },
            translate: (): void => translateFirstExoText(parent),
            dispose,
        };
    },
};
