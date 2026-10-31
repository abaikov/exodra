import { useEffect, useRef } from 'react';
import { wireExoNode } from '@exodra/core';
import type { TExoMachine, TExoNode } from '@exodra/core';
import {
    ExoDomBackend,
    withExoChildList,
    withExoCompiler,
    withExoForeignNamespaces,
    withExoHydration,
} from '@exodra/dom';
import type { TExoDomMark, TExoDomNode } from '@exodra/dom';
import type { TExoMountHandle } from './types/TExoMountHandle';
import type { TExoMountOptions } from './types/TExoMountOptions';
import type { TExoMountSource } from './types/TExoMountSource';

const MOUNT_ONCE: readonly unknown[] = [];

// Module level, not per effect: a schema is cached per backend BY POINTER, so a backend built per
// mount recompiles every schema in the island on every mount.
const EXO_UNCOMPOSED = /*#__PURE__*/ withExoHydration(
    withExoChildList(withExoForeignNamespaces(withExoCompiler(new ExoDomBackend())))
);

type TExoMounted<TParams> = {
    readonly machine: TExoMachine<TExoDomNode, unknown, TParams>;
    readonly root: TExoNode<TExoDomMark>;
    readonly dispose: () => void;
    params: TParams | undefined;
};

function sameParams(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    let count = 0;
    for (const key in left) {
        if (!Object.is(left[key], right[key])) return false;
        count++;
    }
    for (const _key in right) count--;
    return count === 0;
}

function emptyExoContainer(element: Element): void {
    let child = element.firstChild;
    while (child !== null) {
        const next = child.nextSibling;
        child.remove();
        child = next;
    }
}

export function useExoMount<TElement extends Element = HTMLDivElement, TParams = unknown>(
    source: TExoMountSource<TParams>,
    options: TExoMountOptions<TParams> = {}
): TExoMountHandle<TElement> {
    const { deps = MOUNT_ONCE, params } = options;
    const container = useRef<TElement | null>(null);
    const node = useRef<TExoNode<TExoDomMark> | null>(null);
    const mounted = useRef<TExoMounted<TParams> | null>(null);

    // Refs, not closure reads: a fresh arrow on every render must not tear the subtree down, and
    // a closure would instead freeze whatever the render that happened to run the effect had.
    // Re-mounting is `deps` and only `deps`.
    const latestSource = useRef(source);
    latestSource.current = source;
    const latestOptions = useRef(options);
    latestOptions.current = options;

    const place = (element: Element, adopt: boolean): void => {
        const current = latestSource.current;
        const machine = typeof current === 'function' ? current() : current;
        const { backend = EXO_UNCOMPOSED, params: first } = latestOptions.current;
        // The empty-container case is not an edge: StrictMode's second pass runs after the first
        // pass's cleanup emptied it, so adopting must fall back to a build rather than fail.
        const adoptRoot = backend.adoptRoot;
        const root =
            adopt && adoptRoot !== undefined && element.firstElementChild !== null
                ? adoptRoot.call(backend, machine as never, element, first)
                : backend.buildRoot(machine as never, first);
        mounted.current = {
            machine,
            root,
            dispose: backend.mountRoot(root, element),
            params: first,
        };
        node.current = root;
    };

    const remove = (element: Element): void => {
        const live = mounted.current;
        if (live === null) return;
        mounted.current = null;
        node.current = null;
        // The disposer ends subscriptions and nothing else — `mountRoot` APPENDS and has no claim
        // on a parent it does not own — so without the loop a `deps` change would append a second
        // copy beside the first.
        live.dispose();
        emptyExoContainer(element);
    };

    useEffect(() => {
        const element = container.current;
        if (!element) return;
        place(element, latestOptions.current.hydrate ?? false);
        return () => remove(element);
        // Everything else this effect reads is a ref, so the caller's `deps` is complete; an
        // exhaustive-deps linter cannot verify a non-literal array and will only say so.
    }, deps);

    useEffect(() => {
        const live = mounted.current;
        const element = container.current;
        if (live === null || element === null || sameParams(live.params, params)) return;
        // A machine with no wire has nothing to re-run, so new params can only arrive by a rebuild.
        if (live.machine.wire === undefined) {
            remove(element);
            place(element, false);
            return;
        }
        live.params = params;
        wireExoNode(live.root, live.machine, params);
    });

    return { ref: container, node };
}
