import { ExoStrBackend, exoStrSchemaOf } from '@exodra/string';
import { EXO_CAP_ELEMENT } from '../constants/EXO_CAP_ELEMENT';
import { exoSketchOfMarkup } from '../exoSketchOfMarkup';
import type {
    TExoConformanceAdapter,
    TExoConformanceMachine,
} from '../types/TExoConformanceAdapter';

// Built once: a schema is cached per (declaration, backend) and the backend is compared by
// POINTER. Composed with nothing, exactly as a shipped render is.
const EXO_STR = /*#__PURE__*/ new ExoStrBackend();

// The only backend whose artefact is derived rather than held. The three capabilities it does not
// declare are structural: it renders once and subscribes to nothing, and its parse is a snapshot
// nothing is bound to. It DOES declare `EXO_CAP_ELEMENT`, because a probed property is read off the
// element the parser built from its bytes — the state a served page has before any JavaScript runs.
export const exoStrAdapter: TExoConformanceAdapter = {
    name: 'string',
    pkg: '@exodra/string',
    can: new Set([EXO_CAP_ELEMENT]),

    compile(machine: TExoConformanceMachine): void {
        exoStrSchemaOf(machine, EXO_STR);
    },

    render(machine: TExoConformanceMachine, n: number) {
        let markup = '';
        for (let i = 0; i < n; i++) markup += EXO_STR.render(machine);
        return {
            sketch: (probe: readonly string[]): string => exoSketchOfMarkup(markup, probe),
            fire: (): void => {
                throw new Error('exoStrAdapter: no live tree — this call should never be reached');
            },
            translate: (): void => {
                throw new Error('exoStrAdapter: no live tree — this call should never be reached');
            },
            dispose: (): void => undefined,
        };
    },
};
