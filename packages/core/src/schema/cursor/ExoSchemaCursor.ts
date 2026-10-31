import { EXO_PORT_ATTR } from '../ports/constants/EXO_PORT_ATTR';
import { EXO_PORT_ATTR_STRING } from '../ports/constants/EXO_PORT_ATTR_STRING';
import { EXO_PORT_ATTR_TOGGLE } from '../ports/constants/EXO_PORT_ATTR_TOGGLE';
import { EXO_PORT_CHILDREN } from '../ports/constants/EXO_PORT_CHILDREN';
import { EXO_PORT_EVENT } from '../ports/constants/EXO_PORT_EVENT';
import { EXO_PORT_REF } from '../ports/constants/EXO_PORT_REF';
import { EXO_PORT_TEXT } from '../ports/constants/EXO_PORT_TEXT';
import { mintExoPort } from '../ports/factories/mintExoPort';
import { nameExoPort } from '../ports/nameExoPort';
import type { TExoAttrPort } from '../ports/types/TExoAttrPort';
import type { TExoChildrenPort } from '../ports/types/TExoChildrenPort';
import type { TExoEventPort } from '../ports/types/TExoEventPort';
import type { TExoPortName } from '../ports/types/TExoPortName';
import type { TExoTextPort } from '../ports/types/TExoTextPort';
import type { TExoRefPort } from '../ports/types/TExoRefPort';
import type { TExoAnyPort } from '../ports/types/TExoAnyPort';
import type { TExoSchemaCursor } from './types/TExoSchemaCursor';
import type { TExoSchemaDraft } from './types/TExoSchemaDraft';

export class ExoSchemaCursor<TPorts = unknown> implements TExoSchemaCursor<TPorts> {
    /**
     * ONE CURSOR THAT MOVES, AND IT BUILDS NOTHING. `depth` is the only position it keeps: the
     * markup is replayed against a BACKEND's emitter when that backend compiles, so the numbers in
     * `draft` — and the top-level shape `createExoSchema` refuses on — are all this run leaves.
     *
     * Every refusal this class used to make is `withExoSchemaAsserts`, which a caller composes in
     * through the second argument of `createExoSchema`, and which keeps the per-element bookkeeping
     * its asserts read.
     */
    readonly draft: TExoSchemaDraft;
    receiver: TExoSchemaCursor<TPorts>;
    private depth: number;

    constructor(draft: TExoSchemaDraft, depth: number) {
        this.draft = draft;
        this.depth = depth;
        this.receiver = this;
    }

    private fileUnder(portName: string, port: TExoAnyPort): void {
        this.draft.named[portName] = port;
    }

    private mint<TPort extends TExoAnyPort>(kind: TExoAnyPort['kind'], name: string | null): TPort {
        const draft = this.draft;
        return mintExoPort<TPort>(draft.ports, draft.next++, kind, name);
    }

    private describeTop(description: string, tag: string | null): void {
        if (this.depth !== 0) return;
        const draft = this.draft;
        if (draft.describedRoots.length === 0) draft.rootTag = tag;
        draft.describedRoots.push(description);
    }

    el(
        tag: string,
        _attrs?: Readonly<Record<string, unknown>> | null,
        fn?: (cursor: TExoSchemaCursor<TPorts>) => void
    ): this {
        this.describeTop(`<${tag}>`, tag);
        if (fn !== undefined) {
            this.depth++;
            fn(this.receiver);
            this.depth--;
        }
        return this;
    }

    fork(): ExoSchemaCursor<TPorts> {
        return new ExoSchemaCursor<TPorts>(this.draft, this.depth);
    }

    text(value: unknown): this {
        this.describeTop(`the static text ${JSON.stringify(String(value))}`, null);
        return this;
    }

    private placeNamedPort<TPort extends TExoAttrPort | TExoEventPort>(
        first: TPort | string,
        second: string | undefined,
        kind: TPort['kind']
    ): TPort {
        const port =
            typeof first === 'string'
                ? this.mint<TPort>(kind, first)
                : nameExoPort(first, second as string);
        if (typeof first === 'string' && second !== undefined) this.fileUnder(second, port);
        return port;
    }

    private placeGivenPort<TPort extends TExoTextPort | TExoChildrenPort | TExoRefPort>(
        given: TPort | string | undefined,
        kind: TPort['kind']
    ): TPort {
        const port =
            given === undefined || typeof given === 'string' ? this.mint<TPort>(kind, null) : given;
        if (typeof given === 'string') this.fileUnder(given, port);
        return port;
    }

    attrPort(port: TExoAttrPort, name: string): TExoAttrPort;
    attrPort(name: string, portName?: TExoPortName<TPorts, TExoAttrPort>): TExoAttrPort;
    attrPort(first: TExoAttrPort | string, second?: string): TExoAttrPort {
        return this.placeNamedPort(first, second, EXO_PORT_ATTR);
    }

    stringPort(port: TExoAttrPort, name: string): TExoAttrPort;
    stringPort(name: string, portName?: TExoPortName<TPorts, TExoAttrPort>): TExoAttrPort;
    stringPort(first: TExoAttrPort | string, second?: string): TExoAttrPort {
        return this.placeNamedPort(first, second, EXO_PORT_ATTR_STRING);
    }

    togglePort(port: TExoAttrPort, name: string): TExoAttrPort;
    togglePort(name: string, portName?: TExoPortName<TPorts, TExoAttrPort>): TExoAttrPort;
    togglePort(first: TExoAttrPort | string, second?: string): TExoAttrPort {
        return this.placeNamedPort(first, second, EXO_PORT_ATTR_TOGGLE);
    }

    port(name: string, portName?: TExoPortName<TPorts, TExoAttrPort>): TExoAttrPort {
        return this.attrPort(name, portName);
    }

    eventPort(port: TExoEventPort, name: string): TExoEventPort;
    eventPort(name: string, portName?: TExoPortName<TPorts, TExoEventPort>): TExoEventPort;
    eventPort(first: TExoEventPort | string, second?: string): TExoEventPort {
        return this.placeNamedPort(first, second, EXO_PORT_EVENT);
    }

    textPort(port: TExoTextPort): TExoTextPort;
    textPort(portName?: TExoPortName<TPorts, TExoTextPort>): TExoTextPort;
    textPort(given?: TExoTextPort | string): TExoTextPort {
        return this.placeGivenPort(given, EXO_PORT_TEXT);
    }

    childrenPort(port: TExoChildrenPort): TExoChildrenPort;
    childrenPort(portName?: TExoPortName<TPorts, TExoChildrenPort>): TExoChildrenPort;
    childrenPort(given?: TExoChildrenPort | string): TExoChildrenPort {
        this.describeTop('a children port', null);
        return this.placeGivenPort(given, EXO_PORT_CHILDREN);
    }

    refPort(port: TExoRefPort): TExoRefPort;
    refPort(portName?: TExoPortName<TPorts, TExoRefPort>): TExoRefPort;
    refPort(given?: TExoRefPort | string): TExoRefPort {
        return this.placeGivenPort(given, EXO_PORT_REF);
    }
}
