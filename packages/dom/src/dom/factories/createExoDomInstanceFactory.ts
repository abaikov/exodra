import { EXO_NO_MANAGED_STATE, EXO_NO_STATE } from '@exodra/core';
import { EXO_EMPTY_NODES } from '../constants/EXO_EMPTY_NODES';
import type { TExoDomInstanceRecord } from '../types/TExoDomInstanceRecord';
import type { TExoDomSchemaBase } from '../types/TExoDomSchemaBase';

type TExoDomInstanceConstructor = new (schema: TExoDomSchemaBase) => TExoDomInstanceRecord;

// `new` and not `{ __proto__: surface, … }`, and ONE CALL PER SURFACE. The measurement behind both,
// and what a pack replacing this must also replace: ../../README.md § Receiver spelling.
export function createExoDomInstanceFactory(surface: object): TExoDomSchemaBase['createInstance'] {
    function ExoDomInstanceBody(this: TExoDomInstanceRecord, schema: TExoDomSchemaBase): void {
        // The first eleven fields are `createExoDomChildFactory`'s first eleven, in this order, and `live`
        // is last in both: a wire's `c` is one map or the other, and two maps at one offset fold.
        this.nodes = EXO_EMPTY_NODES;
        this.childLists = null;
        this.child = null;
        this.context = null;
        this.schema = schema;
        this.publishedChildListEnds = null;
        // `EXO_NO_STATE` is a shared array and nothing writes into it: a component that keeps a slot
        // is handed one of its own by its wire.
        this.state = EXO_NO_STATE;
        this.managedState = EXO_NO_MANAGED_STATE;
        this.effectStops = null;
        this.transitionOverrides = null;
        this.serviceState = undefined;
        this.live = null;
    }
    // The surface is still empty of methods at this moment — `composeExoPlugins` fills it after the
    // field initialiser that called us — and that is sound because what is stored is the POINTER.
    ExoDomInstanceBody.prototype = surface;
    const ExoDomInstance = ExoDomInstanceBody as unknown as TExoDomInstanceConstructor;
    return (schema) => new ExoDomInstance(schema);
}
