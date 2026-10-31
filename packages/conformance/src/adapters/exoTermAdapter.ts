import { ExoTermBackend, exoTermFire, exoTermSchemaOf } from '@exodra/term';
import { EXO_CAP_LIVE_TREE } from '../constants/EXO_CAP_LIVE_TREE';
import { EXO_CAP_UPDATE } from '../constants/EXO_CAP_UPDATE';
import { exoSketchOfTermRoots } from '../exoSketchOfTermNode';
import type {
    TExoConformanceAdapter,
    TExoConformanceMachine,
} from '../types/TExoConformanceAdapter';

// Built once: a schema is keyed on the backend by POINTER, so one built inside `render` would
// recompile every schema on every case, silently — the sketch is identical either way.
const TERM_BACKEND = new ExoTermBackend();

// Written from outside `@exodra/core`'s exported surface. No `EXO_CAP_ELEMENT`: a flat attribute
// record has no namespace and no object to read a property off. No `EXO_CAP_TEXT_NODE` either, for
// a DIFFERENT reason from the server's — text lives in a FIELD, so there is no node to replace.
export const exoTermAdapter: TExoConformanceAdapter = {
    name: 'term',
    pkg: '@exodra/term',
    can: new Set([EXO_CAP_UPDATE, EXO_CAP_LIVE_TREE]),

    compile(machine: TExoConformanceMachine): void {
        exoTermSchemaOf(machine, TERM_BACKEND);
    },

    render(machine: TExoConformanceMachine, n: number) {
        const screen = TERM_BACKEND.renderScreen(machine, n);
        return {
            sketch: (): string => exoSketchOfTermRoots(screen.roots),
            fire: (type: string): void => {
                const root = screen.roots[0];
                if (root === undefined) {
                    throw new Error('exoTermAdapter: nothing was rendered to fire at');
                }
                exoTermFire(root, type);
            },
            translate: (): void => {
                throw new Error('exoTermAdapter: no text node — this call should never be reached');
            },
            dispose: (): void => screen.dispose(),
        };
    },
};
