import { assertExoArming, exoVocabulary } from '@exodra/core';
import type {
    TExoBaseNodeMethods,
    TExoMachine,
    TExoNode,
    TExoEventHandler,
    TExoEventPort,
    TExoPort,
    TExoPortNodeReader,
    TExoPortTable,
    TExoPortNodeWriter,
    TExoAttrPort,
    TExoTextPort,
    TExoChildrenPort,
    TExoRefPort,
} from '@exodra/core';
import type { TExoChildListEntry } from './types/TExoChildListEntry';
import type { TExoDomInstanceRecord } from './types/TExoDomInstanceRecord';
import type { TExoDomMark } from './types/TExoDomMark';
import type { TExoEventPortData } from '../events/types/TExoEventPortData';
import type { TExoDomSchema } from './types/TExoDomSchema';
import type { TExoDomChild } from './types/TExoDomChild';
import type { TExoDomMachine } from './types/TExoDomMachine';
import type { TExoChildList } from './types/TExoChildList';
import { exoDomSchemaForChild } from './exoDomSchemaForChild';
import { mountExoInstance } from './mountExoInstance';
import { exoOnTeardown } from './exoTeardownScope';
import { exoNextNodeAfterList } from './exoNextNodeAfterList';
import { EXO_ARMED_INSTANCE } from './constants/EXO_ARMED_INSTANCE';
import { walkExoNodeTable } from './walkExoNodeTable';
import { EXO_FIXED_PORT_CHILDREN } from './constants/EXO_FIXED_PORT_CHILDREN';
import { createExoUnarmedChild } from './createExoUnarmedChild';
import type { TExoDomChildPortApi } from './types/TExoDomChildPortApi';
import type { TExoDomPortChildList } from './types/TExoDomPortChildList';
import { armExoDomChild } from './armExoDomChild';
import { disposeExoChildSelf } from './factories/createExoDomChildFactory';

const EMPTY_CHILD_LIST: readonly TExoChildListEntry[] = [];

/** THE BARE EXONODE — the instance's fields plus the shipped methods, and nothing a pack added. Composition is open, so no pack belongs in this name: a site that watches a source spells `TExoDomNode & TExoBindingApi` (which is what `TExoDomWire`/`TExoDomMachine` are), one that wants keyed rows spells `& TExoKeyedListApi`, and a wire that only fills ports names this and runs on every composition — including a bare `new ExoDomBackend()`, whose `render` refuses a component demanding a pack nobody merged. */
export type TExoDomNode = TExoDomInstanceRecord & TExoDomSurface;

/** It adds the narrowed schema and no pack, for the same reason `TExoDomNode` carries none: a pack's own bodies say which they need — `withExoBinding` and `withExoKeyedList` both spell `this: TExoDomRenderNode & TExoBindingApi`, because both reach `this.children`. Why the BASE keeps the base schema: ../../README.md § How the exonode's types and pack are spelled. */
export type TExoDomRenderNode = TExoDomNode & { schema: TExoDomSchema };

/** `TExoMachine<this, …>` and not a flat spelling: the type is contravariant in its exonode, so a flat one refuses a child whose wire uses a method a PACK added. Why this is an `interface` and never an alias: ../../README.md § How the exonode's types and pack are spelled. */
export interface TExoDomNodeApi extends TExoDomChildPortApi {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    portTable(): TExoPortTable;
    portNodeWriter(): TExoPortNodeWriter;
    portNodeReader(): TExoPortNodeReader<Element>;
    portNode<TNode>(port: TExoRefPort<TNode>): unknown extends TNode ? Element : TNode;
    onTeardown(off: () => void): void;
    on(port: TExoEventPort, handler: TExoEventHandler<Event, Element>, subject?: unknown): void;
    one<TParams>(
        port: TExoChildrenPort,
        machine: TExoMachine<this, unknown, TParams>,
        params?: TParams
    ): this & TExoNode<TExoDomMark>;
    list<TParams>(
        port: TExoChildrenPort,
        machine: TExoMachine<this, unknown, TParams>,
        params: readonly TParams[]
    ): void;
    createExoNode<TParams>(
        machine: TExoMachine<this, unknown, TParams>
    ): this & TExoNode<TExoDomMark>;
    armExoSelf(params: unknown): void;
    deferExoTransition(
        run: (enode: never, first: unknown, second: unknown) => void,
        first: unknown,
        second: unknown
    ): boolean;
    destroyExoSelf(): void;
}

/**
 * NOT OPERATIONS AND NOT FOR A WIRE TO CALL — the three places `childList` and `one` differ between
 * RENDERING and ADOPTING, lifted to names because one shared body cannot branch on a phase and a
 * replacement has to have an address. Counted: `openChildList` has one caller and it is `childList`
 * in this very table, `childListEndNode` three and all of them `this.`, `childListStartNode` none
 * outside two suites.
 *
 * SEPARATE FROM `TExoDomNodeApi` SO A WIRE CANNOT SEE THEM. They stay METHODS on the table because
 * `withExoHydration` replaces them BY KEY, and because making them free functions would change the
 * call shape on the mount path — which is not a type question and is not measured.
 */
export interface TExoDomPhaseSeams {
    childListEndNode(port: TExoPort): Node | null | (() => Node | null);
    childListStartNode(port: TExoPort): Node | null;
    openChildList(port: TExoPort, served?: Element[]): TExoDomChild[];
    materializeExoChild(child: TExoDomChild, list: TExoChildList, at: number): void;
}

export interface TExoDomSurface extends TExoDomNodeApi, TExoBaseNodeMethods, TExoDomPortChildList {}

/** No body here may be an arrow: `this` is the exonode, and an arrow has none. The factories are arrows — they run once, at merge, where `this` means nothing. When this table is merged, and what that lets a plugin do: ../../README.md § How the exonode's types and pack are spelled. */
const EXO_DOM_NODE_METHODS: Omit<TExoDomNodeApi, keyof TExoDomChildPortApi> &
    ThisType<TExoDomRenderNode> = {
    attr(port: TExoAttrPort, value: unknown): void {
        const index = port.index;
        const schema = this.schema;
        schema.setters[index](
            this.nodes[schema.elem[index]] as Element,
            value,
            schema.writeData[index]
        );
    },

    /** Its OWN line and not a hop through `attr`: two doors sharing one call site make that site
     * see every attribute body and every text body at once. */
    text(port: TExoTextPort, value: unknown): void {
        const index = port.index;
        const schema = this.schema;
        schema.setters[index](this.nodes[schema.elem[index]] as Element, value);
    },

    unsafeHtml(port: TExoChildrenPort, markup: unknown): void {
        const index = port.index;
        const schema = this.schema;
        schema.setters[index](this.nodes[schema.elem[index]] as Element, markup);
    },

    /** Hands back the instance's own `nodes` array: allocates nothing, stays valid for the life of the INSTANCE, not of the wire. */
    portTable(this: TExoDomNode): TExoPortTable {
        return this.nodes as unknown as TExoPortTable;
    },

    portNodeWriter(): TExoPortNodeWriter {
        const schema = this.schema;
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

    // No per-port writer is handed out; the omission is a refusal — ../../README.md § No per-port writer.

    /** Takes a REF port and only a ref port: a text port's slot may hold the element's Text node rather than the element (`TExoDomSetter.takesTextNode`). */
    portNodeReader(): TExoPortNodeReader<Element> {
        const schema = this.schema;
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

    portNode<TNode>(
        this: TExoDomNode,
        port: TExoRefPort<TNode>
    ): unknown extends TNode ? Element : TNode {
        return this.portNodeReader()(this.portTable(), port) as unknown extends TNode
            ? Element
            : TNode;
    },

    /** The disposer is filed with the OWNER, not with this instance: three of the five paths an instance arrives by (root mount, `c.one` child, fixed-`list` row) build no `TExoDomChild` to run a list. */
    onTeardown(this: TExoDomNode, off: () => void): void {
        exoOnTeardown(this.child, off);
    },

    on(port: TExoEventPort, handler: TExoEventHandler<Event, Element>, subject?: unknown): void {
        const index = port.index;
        const schema = this.schema;
        schema.events.attach(
            this.nodes[schema.elem[index]] as Element,
            schema.writeData[index] as TExoEventPortData,
            handler,
            subject
        );
    },

    /** Hands back THE CHILD'S INSTANCE, which is what a transition is fired at and what `readState` reads the initial state's return out of; `list` keeps `void` — a reconciler builds rows with no caller to receive one. Why it must be ANCHORED and must PUBLISH: ../../README.md § `one`. */
    one(
        this: TExoDomRenderNode & TExoDomPhaseSeams,
        port: TExoChildrenPort,
        machine: TExoDomMachine,
        params?: unknown
    ): TExoDomNodeApi & TExoNode<TExoDomMark> {
        assertExoArming('one');
        (this.portChildren ??= [])[port.index] = EXO_FIXED_PORT_CHILDREN;
        const parent = this.nodes[this.schema.elem[port.index]] as Element;
        const end = this.childListEndNode(port);
        const before = typeof end === 'function' ? end() : end;
        const root = mountExoInstance(
            exoDomSchemaForChild(machine, this.schema.backend),
            machine,
            parent,
            before,
            this.child,
            this.context,
            params
        );
        const childLists = this.childLists;
        if (childLists !== null) childLists[port.index] = [{ node: root }];
        // Republished by `mountExoInstance` after the insertion and the `mounted` commit.
        return EXO_ARMED_INSTANCE.value as TExoDomNodeApi & TExoNode<TExoDomMark>;
    },

    list(
        this: TExoDomRenderNode & TExoDomPhaseSeams,
        port: TExoChildrenPort,
        machine: TExoDomMachine,
        params: readonly unknown[]
    ): void {
        assertExoArming('list');
        (this.portChildren ??= [])[port.index] = EXO_FIXED_PORT_CHILDREN;
        const schema = this.schema;
        const parent = this.nodes[schema.elem[port.index]] as Element;
        const end = this.childListEndNode(port);
        const before = typeof end === 'function' ? end() : end;
        const rowSchema = exoDomSchemaForChild(machine, schema.backend);
        const owner = this.child;
        const context = this.context;
        // Row 0 outside the loop: only the FIRST node is published, and inside the loop that is a
        // comparison per row for one assignment. An empty list leaves `first` null, which is what
        // the publish below reads as EMPTY.
        let first: Element | null = null;
        const count = params.length;
        if (count > 0) {
            first = mountExoInstance(rowSchema, machine, parent, before, owner, context, params[0]);
            for (let i = 1; i < count; i++) {
                mountExoInstance(rowSchema, machine, parent, before, owner, context, params[i]);
            }
        }
        // A fixed list must publish too: unpublished reads EMPTY to the chain, and the list in front anchors past it.
        const childLists = this.childLists;
        if (childLists !== null) {
            childLists[port.index] = first === null ? EMPTY_CHILD_LIST : [{ node: first }];
        }
    },

    createExoNode(machine: TExoDomMachine): TExoDomNodeApi & TExoNode<TExoDomMark> {
        const schema = exoDomSchemaForChild(machine, this.schema.backend);
        const child = createExoUnarmedChild(schema, machine, this.context);
        return child as unknown as TExoDomNodeApi & TExoNode<TExoDomMark>;
    },

    armExoSelf(this: TExoDomChild, params: unknown): void {
        armExoDomChild(this, params);
    },

    deferExoTransition(this: TExoDomChild): boolean {
        armExoDomChild(this, undefined);
        return false;
    },

    destroyExoSelf(this: TExoDomChild): void {
        const list = this.placedIn;
        if (list !== null) list.detach(list.indexOf(this as unknown as TExoNode<TExoDomMark>));
        disposeExoChildSelf.call(this);
    },
};

/** THE THREE SEAMS, OFF THE PUBLIC TABLE. Merged into the same vocabulary, so nothing about
 * the call shape or the replacement by key changes — what changes is that a wire reading
 * `TExoDomNodeApi` no longer sees three methods it must not call. */
const EXO_DOM_PHASE_SEAMS: TExoDomPhaseSeams & ThisType<TExoDomRenderNode> = {
    /** `null` means the child list runs to the end of its parent. Two child lists side by side share one static neighbour, so the one in front must additionally stop at the other's rows — hence the chain. */
    childListEndNode(port: TExoPort): Node | null | (() => Node | null) {
        const schema = this.schema;
        const slot = schema.childListEndSlot[port.index];
        const staticEnd = slot < 0 ? null : (this.nodes[slot] as Node);
        const childLists = this.childLists;
        if (childLists === null || schema.childListNextPort[port.index] < 0) return staticEnd;
        return exoNextNodeAfterList(childLists, schema.childListNextPort, port.index, staticEnd);
    },

    /** EXCLUSIVE — the last STATIC element in front of the list — and not a chain: two adjacent ports both answer with the static before the FIRST of them, which is conservative rather than wrong. Not the question `TExoHydrateNode.adoptFromNode` answers (first element, inclusive). */
    childListStartNode(port: TExoPort): Node | null {
        const slot = this.schema.childListStartSlot[port.index];
        return slot < 0 ? null : (this.nodes[slot] as Node);
    },

    /** What is published is the LIVE array: `attachExoChildren` rewrites it in place on every path and never replaces it, so a neighbour resolving its anchor reads the current first node, not a wiring-time snapshot. */
    openChildList(port: TExoPort): TExoDomChild[] {
        const order: TExoDomChild[] = [];
        const childLists = this.childLists;
        if (childLists !== null) childLists[port.index] = order;
        // A COMMANDED LIST IS STILL THE INSTANCE'S. Without this a child placed by hand is never
        // told the page is going away — a foreign widget goes on running with nothing holding it.
        // It TELLS and does not detach: the document is being discarded, and `unmount` is entitled
        // to find its node still attached.
        exoOnTeardown(this.child, () => {
            for (let i = 0; i < order.length; i++) order[i].unmount();
            order.length = 0;
        });
        return order;
    },

    materializeExoChild(child: TExoDomChild): void {
        const schema = child.schema as TExoDomSchema;
        const element = schema.acquireNode(schema);
        child.node = element;
        walkExoNodeTable(schema, element, child);
    },
};

export const EXO_DOM_NODE_VOCABULARY = /*#__PURE__*/ exoVocabulary(
    EXO_DOM_NODE_METHODS,
    EXO_DOM_PHASE_SEAMS
);
