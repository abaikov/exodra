import { EXO_NO_MANAGED_STATE, EXO_NO_STATE, stopExoEffects } from '@exodra/core';
import { EXO_EMPTY_NODES } from '../constants/EXO_EMPTY_NODES';
import type { TExoDomSchemaBase } from '../types/TExoDomSchemaBase';
import type { TExoDomChild } from '../types/TExoDomChild';

// Shared no-op hook, COMPARED BY IDENTITY (`hook !== EXO_NO_MOUNT`) by `attachExoChildren`'s append
// path to decide whether a real hook ran and the end anchor must be re-resolved.
export const EXO_NO_MOUNT = function (this: TExoDomChild): void {
    // Nothing: a child that wants a mount hook overwrites the field.
};

// Kept separate so the identity test above answers "a real hook ran" for exactly these children.
export const mountExoLiveChild = function (this: TExoDomChild): void {
    const live = this.live;
    if (live !== null) live.setMounted?.(live, true);
};

// Does NOT take the child out of the tree — that is the LIST's job; the list is what holds the parent.
export const disposeExoChildSelf = function (this: TExoDomChild): void {
    // Before the disposers and off the FIELD, not off a closure a machine would have to allocate per
    // instance to say the same thing: the call nulls the array, so a second disposal is a no-op.
    if (this.effectStops !== null) stopExoEffects(this);
    // Emptied, not nulled: a second disposal unsubscribes nothing, and a re-subscribing child reuses it.
    const disposers = this.disposers;
    if (disposers !== null) {
        for (let i = 0; i < disposers.length; i++) disposers[i]();
        disposers.length = 0;
    }
};

type TExoDomChildConstructor = new (
    schema: TExoDomSchemaBase,
    node: Element | undefined,
    unmount?: (this: TExoDomChild) => void
) => TExoDomChild;

// ONE CONSTRUCTOR for clone AND hydration-adopt: an adopted child with no `TExoDomChild` disposes nothing.
// ONE CALL PER SURFACE: two would split a composition's children into TWO hidden classes, polymorphic
// in every reconciler loop here.
// `new`, not `{ __proto__: surface, … }`: the literal costs ~107 ns more per object, and the KEY is
// the price, not the prototype. Per reconciled child — per ROW. ../../README.md § Receiver spelling.
export function createExoDomChildFactory(surface: object): TExoDomSchemaBase['createChild'] {
    function ExoDomChildBody(
        this: TExoDomChild,
        schema: TExoDomSchemaBase,
        node: Element | undefined,
        unmount: (this: TExoDomChild) => void = disposeExoChildSelf
    ): void {
        // Eleven fields, IN `createExoDomInstanceFactory`'S ORDER: two maps fold at one offset, not at two.
        this.nodes = EXO_EMPTY_NODES;
        this.childLists = null;
        this.child = null;
        this.context = null;
        this.schema = schema;
        this.publishedChildListEnds = null;
        // At the same index as in `createExoDomInstanceFactory`; `EXO_NO_STATE` is shared and never written to.
        this.state = EXO_NO_STATE;
        this.managedState = EXO_NO_MANAGED_STATE;
        this.effectStops = null;
        this.transitionOverrides = null;
        this.serviceState = undefined;
        this.machine = null;
        this.portChildren = null;
        this.placedIn = null;
        this.node = node as Element;
        this.mount = EXO_NO_MOUNT;
        this.unmount = unmount;
        this.disposers = null;
        // Stands LAST on purpose: moving it moves every other field's in-object offset.
        this.live = null;
    }
    // Stores the POINTER (later merges are found); a foreign surface = `TypeError` on the first `c.set`.
    ExoDomChildBody.prototype = surface;
    const ExoDomChild = ExoDomChildBody as unknown as TExoDomChildConstructor;
    return (
        schema: TExoDomSchemaBase,
        node: Element | undefined,
        unmount?: (this: TExoDomChild) => void
    ): TExoDomChild => new ExoDomChild(schema, node, unmount);
}
