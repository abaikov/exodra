import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoEmitter,
    TExoEventPort,
    TExoRefPort,
    TExoCursorDeclaration,
    TExoTextPort,
} from '@exodra/core';

// Does this schema put anything in foreign content — the only place an HTML page has namespaces.
// Asked by REPLAYING the markup against an emitter that reads tags and nothing else: a schema is a
// pair of functions, so the only way to see its elements is to let it declare them.
export function exoEntersForeignContent(schema: TExoCursorDeclaration): boolean {
    const probe = new ExoForeignProbe(schema);
    schema.build(probe);
    return probe.found;
}

class ExoForeignProbe implements TExoEmitter {
    found = false;
    private readonly supply: readonly unknown[];
    private next: number;

    constructor(schema: TExoCursorDeclaration) {
        this.supply = schema.portList;
        this.next = schema.declaredPorts;
    }

    private minted<TPort>(): TPort {
        const port = this.supply[this.next];
        this.next++;
        return port as TPort;
    }

    el(
        tag: string,
        _attrs?: Readonly<Record<string, unknown>> | null,
        fn?: (emitter: TExoEmitter) => void
    ): this {
        const lower = tag.toLowerCase();
        if (lower === 'svg' || lower === 'math') this.found = true;
        if (fn !== undefined) fn(this);
        return this;
    }

    text(): this {
        return this;
    }

    attrPort(port: TExoAttrPort, name: string): TExoAttrPort;
    attrPort(name: string, portName?: string): TExoAttrPort;
    attrPort(first: TExoAttrPort | string): TExoAttrPort {
        return typeof first === 'string' ? this.minted<TExoAttrPort>() : first;
    }

    stringPort(port: TExoAttrPort, name: string): TExoAttrPort;
    stringPort(name: string, portName?: string): TExoAttrPort;
    stringPort(first: TExoAttrPort | string): TExoAttrPort {
        return typeof first === 'string' ? this.minted<TExoAttrPort>() : first;
    }

    togglePort(port: TExoAttrPort, name: string): TExoAttrPort;
    togglePort(name: string, portName?: string): TExoAttrPort;
    togglePort(first: TExoAttrPort | string): TExoAttrPort {
        return typeof first === 'string' ? this.minted<TExoAttrPort>() : first;
    }

    port(name: string, portName?: string): TExoAttrPort {
        return this.attrPort(name, portName);
    }

    eventPort(port: TExoEventPort, name: string): TExoEventPort;
    eventPort(name: string, portName?: string): TExoEventPort;
    eventPort(first: TExoEventPort | string): TExoEventPort {
        return typeof first === 'string' ? this.minted<TExoEventPort>() : first;
    }

    refPort(port: TExoRefPort): TExoRefPort;
    refPort(portName?: string): TExoRefPort;
    refPort(given?: TExoRefPort | string): TExoRefPort {
        return given === undefined || typeof given === 'string'
            ? this.minted<TExoRefPort>()
            : given;
    }

    textPort(port: TExoTextPort): TExoTextPort;
    textPort(portName?: string): TExoTextPort;
    textPort(given?: TExoTextPort | string): TExoTextPort {
        return given === undefined || typeof given === 'string'
            ? this.minted<TExoTextPort>()
            : given;
    }

    childrenPort(port: TExoChildrenPort): TExoChildrenPort;
    childrenPort(portName?: string): TExoChildrenPort;
    childrenPort(given?: TExoChildrenPort | string): TExoChildrenPort {
        return given === undefined || typeof given === 'string'
            ? this.minted<TExoChildrenPort>()
            : given;
    }
}
