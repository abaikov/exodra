import { EXO_REACT_SUSPENSE } from './constants/EXO_REACT_SUSPENSE';
import { createElement } from './createElement';
import { readExoReactHook } from './render/readExoReactHook';
import { useCallback } from './useCallback';
import { useLayoutEffect } from './useLayoutEffect';
import { useRef } from './useRef';
import { useState } from './useState';
import type { TExoReactRange } from './types/TExoReactRange';
import type { TExoReactSlot } from './types/TExoReactSlot';

function hostLeaves(range: TExoReactRange, out: Node[]): void {
    for (const slot of range.slots) {
        if (slot.kind === 'host' || slot.kind === 'text') {
            out.push((slot.node as unknown as { node: Node }).node);
        } else if (slot.kind === 'component' && slot.range !== null) {
            hostLeaves(slot.range, out);
        }
    }
}

function SuspenseContent({ hidden, children }: { hidden: boolean; children?: unknown }): unknown {
    const own = readExoReactHook((slot: TExoReactSlot) => ({
        slot,
        hidden: new Map<Node, string>(),
    }));
    useLayoutEffect(() => {
        const leaves: Node[] = [];
        hostLeaves(own.slot.range as TExoReactRange, leaves);
        if (hidden) {
            for (const leaf of leaves) {
                if (own.hidden.has(leaf)) continue;
                if (leaf instanceof HTMLElement) {
                    own.hidden.set(leaf, leaf.style.display);
                    leaf.style.display = 'none';
                } else if (leaf instanceof Text) {
                    own.hidden.set(leaf, leaf.data);
                    leaf.data = '';
                }
            }
            return;
        }
        for (const [leaf, before] of own.hidden) {
            if (leaf instanceof HTMLElement) leaf.style.display = before;
            else if (leaf instanceof Text) leaf.data = before;
        }
        own.hidden.clear();
    }, [hidden]);
    return children;
}

export function Suspense({
    children,
    fallback,
}: {
    children?: unknown;
    fallback?: unknown;
}): unknown {
    const [pending, setPending] = useState(0);
    const shown = useRef(false);
    const register = useCallback((promise: PromiseLike<unknown>) => {
        setPending((n) => n + 1);
        const settle = (): void => setPending((n) => n - 1);
        promise.then(settle, settle);
    }, []);
    useLayoutEffect(() => {
        if (pending === 0) shown.current = true;
    });
    const waiting = pending > 0;
    return createElement(
        EXO_REACT_SUSPENSE.Provider,
        { value: register },
        waiting ? fallback ?? null : null,
        waiting && !shown.current
            ? null
            : createElement(SuspenseContent, { hidden: waiting, children })
    );
}
