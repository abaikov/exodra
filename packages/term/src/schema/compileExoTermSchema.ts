import {
    EXO_PORT_ATTR,
    EXO_PORT_ATTR_STRING,
    EXO_PORT_ATTR_TOGGLE,
    EXO_PORT_CHILDREN,
    EXO_PORT_EVENT,
    EXO_PORT_REF,
    EXO_PORT_TEXT,
    EXO_VOID_ELEMENTS,
    assertExoOneRoot,
    assertExoRootElement,
    mintExoPort,
    nameExoPort,
} from '@exodra/core';
import type {
    TExoAnyPort,
    TExoAttrPort,
    TExoChildrenPort,
    TExoEmitter,
    TExoEventPort,
    TExoRefPort,
    TExoCursorDeclaration,
    TExoTextPort,
} from '@exodra/core';
import type { TExoTermApi } from '../backend/types/TExoTermApi';
import { exoTermWriterForPort } from '../utilities/exoTermWriterForPort';
import type { TExoTermSchema } from './types/TExoTermSchema';
import type {
    TExoTermProtoKid,
    TExoTermProtoElement,
} from '../instance/types/TExoTermProtoElement';
import type { TExoTermWriter } from '../utilities/types/TExoTermWriter';

// A gap read as `undefined` would throw "undefined is not a function" from inside `set`.
function createMissingWriter(index: number): TExoTermWriter {
    return () => {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `TExoTermNode: port ${index} was numbered by the schema but never reached ` +
                  'by compileExoTermSchema — the two walks disagree about the shape'
                : 'EXO0061'
        );
    };
}

// One element while it is OPEN. Its node is pushed into the parent as soon as the tag is known, so
// the kids a callback declares land in it by reference and nothing is assembled a second time.
type TExoTermOpenElement = {
    readonly tag: string;
    readonly attrs: Record<string, string>;
    readonly ports: number[];
    readonly kids: TExoTermProtoKid[];
    readonly isVoid: boolean;
    hasContent: boolean;
    pendingText: string;
    anyText: boolean;
};

// The walk's ORDER is irrelevant here, unlike `compileExoStrSchema`, whose output is a piece LIST:
// everything here is indexed by `port.index` directly. The shared refusal below is asked for even
// though this backend needs it for nothing — a schema must be accepted or refused identically.
class ExoTermEmitter implements TExoEmitter {
    root: TExoTermProtoElement | null = null;
    rootTag: string | null = null;
    readonly writers: TExoTermWriter[];
    readonly names: (string | null)[];
    readonly roots: string[] = [];
    private portCount: number;
    private readonly supply: TExoAnyPort[];
    private next: number;
    private frame: TExoTermOpenElement | null = null;
    private loose: TExoTermOpenElement | null = null;

    constructor(schema: TExoCursorDeclaration) {
        const portCount = schema.portList.length;
        this.portCount = portCount;
        this.supply = schema.portList;
        this.next = schema.declaredPorts;
        this.writers = new Array<TExoTermWriter>(portCount);
        this.names = new Array<string | null>(portCount);
        for (let i = 0; i < portCount; i++) {
            this.writers[i] = createMissingWriter(i);
            this.names[i] = null;
        }
    }

    private minted<TPort extends TExoAnyPort>(
        kind: TExoAnyPort['kind'],
        name: string | null
    ): TPort {
        const at = this.next++;
        const fresh = at >= this.supply.length;
        const port = mintExoPort<TPort>(this.supply, at, kind, name);
        if (fresh) {
            this.writers.push(createMissingWriter(at));
            this.names.push(null);
            this.portCount = at + 1;
        }
        return port;
    }

    // A port declared OUTSIDE the root element is dropped, which is what the tree walk this
    // replaced did with one: it started at the root and never saw it. Its writer stays the missing
    // one, so a fill through it names the port rather than writing somewhere wrong.
    private standing(): TExoTermOpenElement {
        const frame = this.frame;
        if (frame !== null) return frame;
        return (this.loose ??= {
            tag: '#outside',
            attrs: Object.create(null) as Record<string, string>,
            ports: [],
            kids: [],
            isVoid: false,
            hasContent: false,
            pendingText: '',
            anyText: false,
        });
    }

    private take(port: TExoAnyPort, frame: TExoTermOpenElement): void {
        if (frame === this.loose) return;
        const index = port.index;
        if (index < 0 || index >= this.portCount) {
            throw new Error(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `compileExoTermSchema: port index ${index} is outside the schema's ` +
                      `${this.portCount} ports — the schema was not closed, or its root was not ` +
                      'the numbered one'
                    : 'EXO0062'
            );
        }
        this.writers[index] = exoTermWriterForPort(port.kind, port.name);
        if (port.kind === EXO_PORT_EVENT) this.names[index] = port.name;
        frame.ports.push(index);
    }

    private refuseVoidContent(tag: string): never {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `compileExoTermSchema: <${tag}> is a void element and cannot have content`
                : 'EXO0063'
        );
    }

    private flushText(frame: TExoTermOpenElement): void {
        if (!frame.anyText) return;
        const run = frame.pendingText;
        frame.pendingText = '';
        frame.anyText = false;
        // MERGED: a run is the unit an HTML parser would produce. Appended RAW.
        frame.kids.push({ text: run });
    }

    el(
        tag: string,
        attrs?: Readonly<Record<string, unknown>> | null,
        fn?: (emitter: TExoEmitter) => void
    ): this {
        const parent = this.frame;
        if (parent === null) {
            this.roots.push(`<${tag}>`);
            if (this.rootTag === null) this.rootTag = tag;
        } else {
            if (parent.isVoid) this.refuseVoidContent(parent.tag);
            this.flushText(parent);
        }
        // Normalised once, here, so `class` and `className` cannot end up as two keys.
        const normalised: Record<string, string> = Object.create(null) as Record<string, string>;
        if (attrs !== undefined && attrs !== null) {
            for (const name in attrs) normalised[name.toLowerCase()] = String(attrs[name]);
        }
        const frame: TExoTermOpenElement = {
            tag,
            attrs: normalised,
            ports: [],
            kids: [],
            isVoid: EXO_VOID_ELEMENTS.has(tag),
            hasContent: false,
            pendingText: '',
            anyText: false,
        };
        this.frame = frame;
        if (fn !== undefined) fn(this);
        this.flushText(frame);
        const node: TExoTermProtoElement = {
            tag: frame.tag,
            attrs: frame.attrs,
            ports: frame.ports,
            hasContent: frame.hasContent,
            kids: frame.kids,
        };
        if (parent === null) {
            if (this.root === null) this.root = node;
        } else {
            parent.kids.push(node);
        }
        this.frame = parent;
        return this;
    }

    text(value: unknown): this {
        if (this.frame === null) {
            this.roots.push(`the static text ${JSON.stringify(String(value))}`);
        }
        const frame = this.standing();
        if (frame.isVoid) this.refuseVoidContent(frame.tag);
        frame.pendingText += String(value);
        frame.anyText = true;
        return this;
    }

    private placeAttrPort(port: TExoAnyPort): void {
        this.take(port, this.standing());
    }

    attrPort(port: TExoAttrPort, name: string): TExoAttrPort;
    attrPort(name: string, portName?: string): TExoAttrPort;
    attrPort(first: TExoAttrPort | string, second?: string): TExoAttrPort {
        const port =
            typeof first === 'string'
                ? this.minted<TExoAttrPort>(EXO_PORT_ATTR, first)
                : nameExoPort(first, second as string);
        this.placeAttrPort(port);
        return port;
    }

    stringPort(port: TExoAttrPort, name: string): TExoAttrPort;
    stringPort(name: string, portName?: string): TExoAttrPort;
    stringPort(first: TExoAttrPort | string, second?: string): TExoAttrPort {
        const port =
            typeof first === 'string'
                ? this.minted<TExoAttrPort>(EXO_PORT_ATTR_STRING, first)
                : nameExoPort(first, second as string);
        this.placeAttrPort(port);
        return port;
    }

    togglePort(port: TExoAttrPort, name: string): TExoAttrPort;
    togglePort(name: string, portName?: string): TExoAttrPort;
    togglePort(first: TExoAttrPort | string, second?: string): TExoAttrPort {
        const port =
            typeof first === 'string'
                ? this.minted<TExoAttrPort>(EXO_PORT_ATTR_TOGGLE, first)
                : nameExoPort(first, second as string);
        this.placeAttrPort(port);
        return port;
    }

    port(name: string, portName?: string): TExoAttrPort {
        return this.attrPort(name, portName);
    }

    eventPort(port: TExoEventPort, name: string): TExoEventPort;
    eventPort(name: string, portName?: string): TExoEventPort;
    eventPort(first: TExoEventPort | string, second?: string): TExoEventPort {
        const port =
            typeof first === 'string'
                ? this.minted<TExoEventPort>(EXO_PORT_EVENT, first)
                : nameExoPort(first, second as string);
        this.placeAttrPort(port);
        return port;
    }

    refPort(port: TExoRefPort): TExoRefPort;
    refPort(portName?: string): TExoRefPort;
    refPort(given?: TExoRefPort | string): TExoRefPort {
        const port =
            given === undefined || typeof given === 'string'
                ? this.minted<TExoRefPort>(EXO_PORT_REF, null)
                : given;
        this.placeAttrPort(port);
        return port;
    }

    textPort(port: TExoTextPort): TExoTextPort;
    textPort(portName?: string): TExoTextPort;
    textPort(given?: TExoTextPort | string): TExoTextPort {
        const frame = this.standing();
        if (frame.isVoid) this.refuseVoidContent(frame.tag);
        const port =
            given === undefined || typeof given === 'string'
                ? this.minted<TExoTextPort>(EXO_PORT_TEXT, null)
                : given;
        this.take(port, frame);
        frame.hasContent = true;
        return port;
    }

    childrenPort(port: TExoChildrenPort): TExoChildrenPort;
    childrenPort(portName?: string): TExoChildrenPort;
    childrenPort(given?: TExoChildrenPort | string): TExoChildrenPort {
        if (this.frame === null) this.roots.push('a children port');
        const frame = this.standing();
        if (frame.isVoid) this.refuseVoidContent(frame.tag);
        this.flushText(frame);
        const port =
            given === undefined || typeof given === 'string'
                ? this.minted<TExoChildrenPort>(EXO_PORT_CHILDREN, null)
                : given;
        if (port.kind !== EXO_PORT_CHILDREN) {
            throw new Error(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `compileExoTermSchema: a port of kind ${String(port.kind)} stands among <` +
                      `${frame.tag}>'s children — only a children port belongs there`
                    : 'EXO0064'
            );
        }
        this.take(port, frame);
        frame.kids.push({ port: port.index });
        return port;
    }
}

export function compileExoTermSchema(
    schema: TExoCursorDeclaration,
    backend: TExoTermApi
): TExoTermSchema {
    const emitter = new ExoTermEmitter(schema);
    schema.build(emitter);
    assertExoOneRoot(emitter.roots);
    assertExoRootElement(emitter.rootTag);
    const proto = emitter.root as TExoTermProtoElement;

    // BUILT WHOLE, IN ONE LITERAL, so a schema never gains a field by a later shape transition.
    return {
        proto,
        writers: emitter.writers,
        names: emitter.names,
        portCount: schema.portList.length,
        rootTag: emitter.rootTag as string,
        ports: schema.portList,
        backend,
        // Taken off the backend at COMPILE time: a pack that replaced it allocates every instance
        // under that composition, at no per-instance load.
        createInstance: backend.createInstance,
        termPortWrite: null,
        termPortNodes: null,
    };
}
