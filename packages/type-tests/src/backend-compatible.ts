import { composeExoPlugins, exoBackendCompatible, exoBackendTypeOf } from '@exodra/core';
import {
    EXO_DOM_FOREIGN_VOCABULARY,
    ExoDomBackend,
    exoForeignNode,
    withExoCompiler,
} from '@exodra/dom';
import { EXO_STR_FOREIGN_VOCABULARY, ExoStrBackend, exoForeignMarkup } from '@exodra/string';

const APP = composeExoPlugins(withExoCompiler(new ExoDomBackend()), EXO_DOM_FOREIGN_VOCABULARY);
const SERVER = composeExoPlugins(new ExoStrBackend(), EXO_STR_FOREIGN_VOCABULARY);
const BARE_SERVER = new ExoStrBackend();

const BACKENDS = { app: exoBackendTypeOf(APP), server: exoBackendTypeOf(SERVER) } as const;

export const CHART = exoBackendCompatible(BACKENDS, 'foreign', {
    createDom: (c) => exoForeignNode(c, document.createElement('canvas')),
    createStr: () => exoForeignMarkup('<canvas></canvas>'),
});

// @ts-expect-error the server's half is missing
exoBackendCompatible(BACKENDS, 'foreign', {
    createDom: (c) => exoForeignNode(c, document.createElement('canvas')),
});

exoBackendCompatible(
    { app: exoBackendTypeOf(APP), server: exoBackendTypeOf(BARE_SERVER) },
    'foreign',
    {
        // @ts-expect-error the server in this set has no foreign door
        createDom: (c) => exoForeignNode(c, document.createElement('canvas')),
        createStr: () => exoForeignMarkup('<canvas></canvas>'),
    }
);
