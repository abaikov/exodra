import { createExoChildList } from '@exodra/dom';
import type { TExoDomRenderNode } from '@exodra/dom';
import { createExoSchema } from '@exodra/core';
import { provideExoIds } from '@exodra/context';
import { EXO_REACT_BACKEND } from './constants/EXO_REACT_BACKEND';
import { enableExoReactHostTemplates } from './enableExoReactHostTemplates';
import { flushExoReactUpdates } from './render/flushExoReactUpdates';
import { reconcileExoReactRegion } from './render/reconcileExoReactRegion';
import type { TExoReactRange } from './types/TExoReactRange';
import type { TExoReactRootOptions } from './types/TExoReactRootOptions';

enableExoReactHostTemplates();

const ROOT_DECLARATION = createExoSchema((b) => {
    b.el('div');
    return null;
});
const ROOT_MACHINE = {
    declaration: ROOT_DECLARATION,
    forms: [],
    createInitialState: null,
    effects: [],
    handlers: [],
};

export function createRoot(
    container: Element,
    options: TExoReactRootOptions = {}
): {
    render(children: unknown): void;
    unmount(): void;
} {
    const backend = EXO_REACT_BACKEND;
    const owner = Object.create(backend) as TExoDomRenderNode;
    owner.schema = backend.schema(ROOT_MACHINE);
    owner.context = null;
    provideExoIds(owner, `:${options.identifierPrefix ?? ''}r`);
    container.textContent = '';
    const range: TExoReactRange = {
        list: createExoChildList(container, [], null, false),
        owner,
        component: null,
        parentSlot: null,
        slots: [],
        leafCount: 0,
        changed: false,
    };
    return {
        render(children: unknown): void {
            reconcileExoReactRegion(range, children);
            flushExoReactUpdates();
        },
        unmount(): void {
            reconcileExoReactRegion(range, null);
            flushExoReactUpdates();
        },
    };
}
