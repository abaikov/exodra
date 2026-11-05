import { exoVocabulary } from '@exodra/core';
import { EXO_UNARMED_STATE } from '@exodra/core';
import { armExoDomChild } from '../dom/armExoDomChild';
import { EXO_FIXED_PORT_CHILDREN } from '../dom/constants/EXO_FIXED_PORT_CHILDREN';
import { holdExoInstance } from '../dom/holdExoInstance';
import { walkExoNodeTable } from '../dom/walkExoNodeTable';
import { walkExoHydrateTable } from './walkExoHydrateTable';
import { EXO_PENDING_WIRE } from './constants/EXO_PENDING_WIRE';
import { EXO_NO_PENDING_WIRE } from './constants/EXO_NO_PENDING_WIRE';
import type { TExoChildList } from '../dom/types/TExoChildList';
import type {
    TExoNode,
    TExoEventHandler,
    TExoEventPort,
    TExoPort,
    TExoPortNodeReader,
    TExoPortNodeWriter,
    TExoChildrenPort,
} from '@exodra/core';
import type { TExoDomPhaseSeams, TExoDomSurface } from '../dom/EXO_DOM_NODE_VOCABULARY';
import type { TExoDomInstanceRecord } from '../dom/types/TExoDomInstanceRecord';
import type { TExoDomMark } from '../dom/types/TExoDomMark';
import type { TExoDomChild } from '../dom/types/TExoDomChild';
import type { TExoDomMachine } from '../dom/types/TExoDomMachine';
import type { TExoEventPortData } from '../events/types/TExoEventPortData';
import type { TExoHydrateSchema } from './types/TExoHydrateSchema';
import { readExoLiveDomSchema } from './readExoLiveDomSchema';
import type { TExoDomSchema } from '../dom/types/TExoDomSchema';
import { exoOnTeardown } from '../dom/exoTeardownScope';
import { EXO_ADOPT_STOP_UNKNOWN } from '../dom/constants/EXO_ADOPT_STOP_UNKNOWN';
import { EXO_ARMED_INSTANCE } from '../dom/constants/EXO_ARMED_INSTANCE';
import { hydrateExoInstance } from './hydrateExoInstance';
import { exoHydrateSchemaOf } from './exoHydrateSchemaOf';
import { assertExoPluginChildList } from './asserts/assertExoPluginChildList';
import { exoChildListStartAfter } from './exoChildListStartAfter';
import { requireExoElement } from './requireExoElement';
import type { TExoDomNode } from '../dom/EXO_DOM_NODE_VOCABULARY';
import type { TExoDomForeignApi } from '../foreign/types/TExoDomForeignApi';

/** The exonode of an adopting pass. Chain: `exonode -> hydrate surface -> composed backend`, so a name adoption does not claim falls through to whatever the application merged. See src/hydrate/README.md. */
export type TExoHydrateNode = TExoDomInstanceRecord & {
    /** `TExoDomNode` keeps the BASE schema, which is what keeps this assignable to it. */
    schema: TExoHydrateSchema;
} & Omit<TExoDomSurface, keyof TExoHydrateSurface> &
    TExoHydrateSurface &
    TExoHydratePhaseSeams;

/** Declared and not inferred: the bodies below name `TExoHydrateNode` as their `this`, and inferring the exonode from a table whose bodies name it is a circular initialiser the checker refuses. */
export interface TExoHydrateSurface {
    portNodeWriter(): TExoPortNodeWriter;
    portNodeReader(): TExoPortNodeReader<Element>;
    on(port: TExoEventPort, handler: TExoEventHandler<Event, Element>, subject?: unknown): void;
    /** The component-taking members name the shipped exonode (`TExoDomMachine`) and not `this`: `TExoMachine` is contravariant in its exonode, so `this` here would stop a portable component being placeable by an adopting call. */
    one(port: TExoChildrenPort, machine: TExoDomMachine): TExoHydrateNode;
    list(port: TExoChildrenPort, machine: TExoDomMachine, params: readonly unknown[]): void;
    createExoNode(machine: TExoDomMachine): TExoNode<TExoDomMark>;
    armExoSelf(params: unknown): void;
    deferExoTransition(
        run: (enode: never, first: unknown, second: unknown) => void,
        first: unknown,
        second: unknown
    ): boolean;
}

/**
 * WHAT ADOPTION REPLACES UNDER `childList` AND `one`, PLUS ITS OWN THREE. None is an operation a
 * wire performs: every call site is `this.` inside this table. They are names because a
 * replacement has to have an address, and they are OFF `TExoHydrateSurface` so that the exported
 * surface of an adopting exonode is the one a wire may call.
 */
export interface TExoHydratePhaseSeams {
    childListEndNode(port: TExoPort): Node | null;
    childListStartNode(port: TExoPort): Node | null;
    openChildList(port: TExoChildrenPort, served?: Element[]): TExoDomChild[];
    publishChildListEnd(port: TExoPort, end: Element | null): void;
    adoptFromNode(port: TExoPort, parent: Element): Element | null;
    adoptStopNode(port: TExoPort): Node | null | undefined;
    materializeExoChild(child: TExoDomChild, list: TExoChildList, at: number): void;
}

type TExoLiveMethods = TExoDomSurface & TExoDomPhaseSeams;

function liveExoMethodsOf(node: { schema: unknown }): TExoLiveMethods {
    return (node.schema as { backend: unknown }).backend as TExoLiveMethods;
}

function replayExoTransitions(child: TExoDomChild, calls: readonly unknown[]): void {
    for (let i = 0; i < calls.length; i += 3) {
        (calls[i] as (enode: TExoDomChild, first: unknown, second: unknown) => void)(
            child,
            calls[i + 1],
            calls[i + 2]
        );
    }
}

function resolveExoChildListEnd(end: Node | null | (() => Node | null)): Node | null {
    return typeof end === 'function' ? end() : end;
}

/** No body here is an arrow: an arrow has no `this`, and `this` is the exonode. */
const EXO_HYDRATE_NODE_METHODS: TExoHydrateSurface &
    TExoHydratePhaseSeams &
    ThisType<TExoHydrateNode> = {
    /** `live`/`liveElem`, never the adoption pair: that one is silenced and holds slot 0 for every silenced port, so a writer built from it would silently do nothing for the life of the page. */
    portNodeWriter(): TExoPortNodeWriter {
        const schema = readExoLiveDomSchema(this.schema as TExoHydrateSchema | TExoDomSchema);
        let write = schema.domPortWrite;
        if (write === null) {
            const setters = schema.setters;
            const elem = schema.elem;
            const data = schema.writeData;
            write = (table, port, value): void => {
                const index = port.index;
                setters[index](
                    (table as unknown as Node[])[elem[index]] as Element,
                    value,
                    data[index]
                );
            };
            schema.domPortWrite = write;
        }
        return write;
    },

    portNodeReader(): TExoPortNodeReader<Element> {
        const schema = readExoLiveDomSchema(this.schema as TExoHydrateSchema | TExoDomSchema);
        let at = schema.domPortNodes;
        if (at === null) {
            const elem = schema.elem;
            at = (table, port): Element => {
                const nodes = table as unknown as Node[];
                return nodes[elem[port.index]] as Element;
            };
            schema.domPortNodes = at;
        }
        return at;
    },

    /** `elem` and not `liveElem`: an event port is one `compileExoHydrateSchema` leaves pointing at its real element, because attaching the listener IS the adoption. */
    on(port: TExoEventPort, handler: TExoEventHandler<Event, Element>, subject?: unknown): void {
        const i = port.index;
        const schema = this.schema;
        schema.events.attach(
            this.nodes[schema.elem[i]] as Element,
            schema.writeData[i] as TExoEventPortData,
            handler,
            subject
        );
    },

    one(port: TExoChildrenPort, machine: TExoDomMachine, params?: unknown): TExoHydrateNode {
        if (!('domSchema' in this.schema))
            return liveExoMethodsOf(this).one.call(
                this,
                port,
                machine as never,
                params
            ) as unknown as TExoHydrateNode;
        (this.portChildren ??= [])[port.index] = EXO_FIXED_PORT_CHILDREN;
        const parent = this.nodes[this.schema.liveElem[port.index]] as Element;
        const root = requireExoElement(this.adoptFromNode(port, parent), 'a nested instance');
        // In a local, so the record below is made by THIS schema's factory and not the owner's: the
        // schema a record is born holding decides which setter table its every `c.set` indexes.
        const schema = exoHydrateSchemaOf(machine, this.schema.backend);
        hydrateExoInstance(
            schema,
            root,
            machine,
            this.child,
            schema.createInstance(schema),
            this.context,
            params
        );
        this.publishChildListEnd(port, root.nextElementSibling);
        return EXO_ARMED_INSTANCE.value as TExoHydrateNode;
    },

    list(port: TExoChildrenPort, machine: TExoDomMachine, params: readonly unknown[]): void {
        if (!('domSchema' in this.schema))
            return liveExoMethodsOf(this).list.call(this, port, machine as never, params);
        (this.portChildren ??= [])[port.index] = EXO_FIXED_PORT_CHILDREN;
        const parent = this.nodes[this.schema.liveElem[port.index]] as Element;
        const schema = exoHydrateSchemaOf(machine, this.schema.backend);
        const ownerChild = this.child;
        const context = this.context;
        // A fixed list is the one adopting call with no shape check — every row is the same schema —
        // so this bound is what stops the static behind the child list being wired as the last row.
        const stop = this.adoptStopNode(port);
        let at = this.adoptFromNode(port, parent);
        for (let i = 0; i < params.length; i++) {
            const node = requireExoElement(at === stop ? null : at, 'a fixed list row');
            hydrateExoInstance(
                schema,
                node,
                machine,
                ownerChild,
                schema.createInstance(schema),
                context,
                params[i]
            );
            at = node.nextElementSibling;
        }
        this.publishChildListEnd(port, at);
    },

    /** The static behind the child list, so a row the data added past the served ones lands in front
     * of it rather than at the end of the parent. `undefined` cannot be resolved and reads as `null`,
     * which is the end of the parent — and `openChildList` refuses that shape before it gets here. */
    childListEndNode(port: TExoPort): Node | null {
        if (!('domSchema' in this.schema))
            return resolveExoChildListEnd(liveExoMethodsOf(this).childListEndNode.call(this, port));
        const stop = this.adoptStopNode(port);
        return stop === undefined ? null : stop;
    },

    /** The reconciler's lower bound (exclusive), not `adoptFromNode`'s first row (inclusive) — and
     * `previousSibling`, not `previousElementSibling`, because the consumer walks node by node. */
    childListStartNode(port: TExoPort): Node | null {
        if (!('domSchema' in this.schema))
            return liveExoMethodsOf(this).childListStartNode.call(this, port);
        const index = port.index;
        const prev = this.schema.childListPrevPort[index];
        if (prev >= 0) {
            const first = exoChildListStartAfter(
                this.publishedChildListEnds as (Element | null | undefined)[],
                prev,
                this.schema.childListPrevStatics[index],
                index
            );
            return first === null ? null : first.previousSibling;
        }
        const slot = this.schema.childListStartSlot[index];
        return slot < 0 ? null : (this.nodes[slot] as Node);
    },

    /** Answers `[]` AND OPENS AN ADOPTION CURSOR over the rows the server printed, so the reconciler's
     * opening pass — which calls `build` once per item — adopts them instead of building beside them.
     * Refused only where no walk can find the list's end, which is a child list standing behind
     * another: there the first row of the one behind is indistinguishable from a surplus of this one. */
    openChildList(port: TExoChildrenPort, served?: Element[]): TExoDomChild[] {
        if (!('domSchema' in this.schema))
            return liveExoMethodsOf(this).openChildList.call(this, port);
        const stop = this.adoptStopNode(port);
        if (stop === undefined) return assertExoPluginChildList();
        const parent = this.nodes[this.schema.liveElem[port.index]] as Element;
        // ONE WALK DOES BOTH: it collects the rows, because reading a sibling later is reading a
        // list `insert` has already reordered, and it finds the end, which a child list standing
        // behind this one resolves its own start from before this one's rows are built.
        const rows: Element[] = [];
        let end: Element | null = this.adoptFromNode(port, parent);
        while (end !== null && end !== stop) {
            rows.push(end);
            end = end.nextElementSibling;
        }
        this.publishChildListEnd(port, end);
        if (served !== undefined) for (let i = 0; i < rows.length; i++) served.push(rows[i]);
        const order: TExoDomChild[] = [];
        exoOnTeardown(this.child, () => {
            for (let i = 0; i < order.length; i++) order[i].unmount();
            order.length = 0;
        });
        return order;
    },

    createExoNode(machine: TExoDomMachine): TExoNode<TExoDomMark> {
        const schema = exoHydrateSchemaOf(machine, this.schema.backend);
        const child = schema.createChild(schema, undefined, schema.domSchema.childUnmount);
        child.child = child;
        child.context = this.context;
        child.machine = machine;
        child.state = EXO_UNARMED_STATE;
        return child as unknown as TExoNode<TExoDomMark>;
    },

    armExoSelf(this: TExoDomChild & TExoHydrateNode, params: unknown): void {
        if (this.node === undefined) {
            const pending = EXO_PENDING_WIRE.get(this);
            const calls =
                pending === undefined || pending === EXO_NO_PENDING_WIRE ? [] : pending.calls;
            EXO_PENDING_WIRE.set(this, { params, calls });
            return;
        }
        armExoDomChild(this, params);
    },

    deferExoTransition(
        this: TExoDomChild & TExoHydrateNode,
        run: (enode: never, first: unknown, second: unknown) => void,
        first: unknown,
        second: unknown
    ): boolean {
        if (this.node !== undefined) {
            armExoDomChild(this, undefined);
            return false;
        }
        const pending = EXO_PENDING_WIRE.get(this);
        if (pending === undefined || pending === EXO_NO_PENDING_WIRE) {
            EXO_PENDING_WIRE.set(this, { params: undefined, calls: [run, first, second] });
        } else {
            pending.calls.push(run, first, second);
        }
        return true;
    },

    materializeExoChild(child: TExoDomChild, list: TExoChildList, at: number): void {
        const schema = child.schema as TExoHydrateSchema;
        const pending = EXO_PENDING_WIRE.get(child);
        if (pending !== undefined) EXO_PENDING_WIRE.set(child, EXO_NO_PENDING_WIRE);
        const wired = pending !== undefined && pending !== EXO_NO_PENDING_WIRE;
        const served = list.takeServed(at);
        if (served !== null) {
            child.node = served;
            if (wired) {
                hydrateExoInstance(
                    schema,
                    served,
                    child.machine as TExoDomMachine,
                    child,
                    child,
                    child.context,
                    pending.params,
                    pending.calls
                );
                holdExoInstance(child);
                return;
            }
            walkExoHydrateTable(schema, served, child);
            child.schema = schema.domSchema;
            return;
        }
        const dom = schema.domSchema;
        const element = dom.acquireNode(dom);
        child.node = element;
        child.schema = dom;
        walkExoNodeTable(dom, element, child);
        if (wired) {
            armExoDomChild(child, pending.params);
            replayExoTransitions(child, pending.calls);
        }
    },

    publishChildListEnd(port: TExoPort, end: Element | null): void {
        const ends = this.publishedChildListEnds;
        if (ends !== null) ends[port.index] = end;
    },

    /** `liveElem[port]` is the element the child list lives IN, so for a port among static siblings
     * `parent.firstElementChild` is the heading and not row 0. Where a static stands BETWEEN two child
     * lists, the one in front publishes where its markup ended and this one begins `childListPrevStatics`
     * elements after it — which requires the ports to be filled in document order. */
    adoptFromNode(port: TExoPort, parent: Element): Element | null {
        const index = port.index;
        const prev = this.schema.childListPrevPort[index];
        if (prev >= 0) {
            return exoChildListStartAfter(
                this.publishedChildListEnds as (Element | null | undefined)[],
                prev,
                this.schema.childListPrevStatics[index],
                index
            );
        }
        const slot = this.schema.childListStartSlot[index];
        return slot < 0
            ? parent.firstElementChild
            : (this.nodes[slot] as Element).nextElementSibling;
    },

    /** Three answers: an ELEMENT (the static behind the child list, resolved from the end of its parent
     * so the rows cannot shift it), `null` (the child list runs to the end of its parent), and `undefined`
     * — another child list stands behind this one and no walk can reach the element they would share.
     * `undefined` makes `at !== stop` fall through on its own; a WRONG boundary would stop a row loop
     * early or take a live element out of the page. */
    adoptStopNode(port: TExoPort): Node | null | undefined {
        const slot = this.schema.adoptStopSlot[port.index];
        if (slot === EXO_ADOPT_STOP_UNKNOWN) return undefined;
        return slot < 0 ? null : this.nodes[slot];
    },
};

/** Merged onto a second object and not onto the backend: fifteen of these names are the render pack's
 * too, and `composeExoPlugins` is last-claim-wins — `render` would build through hydration's `set` and
 * every client-rendered page would come out blank with nothing thrown. */
const EXO_HYDRATE_FOREIGN_METHODS: TExoDomForeignApi & ThisType<TExoHydrateNode> = {
    foreign(t: { createDom(c: TExoDomNode): TExoNode<TExoDomMark> }): TExoNode<TExoDomMark> {
        const base = (this.schema.backend as Partial<TExoDomForeignApi>).foreign;
        if (base === undefined) {
            throw new Error(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? 'exodra: c.foreign(...) was called while hydrating on a backend that did not ' +
                      'compose EXO_DOM_FOREIGN_VOCABULARY. Compose it onto the backend the page ' +
                      'hydrates through, as on the one it renders through.'
                    : 'EXO0100'
            );
        }
        return base.call(this, t);
    },
};

export const EXO_HYDRATE_NODE_VOCABULARY = /*#__PURE__*/ exoVocabulary(
    EXO_HYDRATE_NODE_METHODS,
    EXO_HYDRATE_FOREIGN_METHODS
);
