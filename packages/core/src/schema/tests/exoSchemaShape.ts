import { harvestExoSchema } from '../factories/harvestExoSchema';
import type { TExoAnyPort } from '../ports/types/TExoAnyPort';
import type { TExoAttrPort } from '../ports/types/TExoAttrPort';
import type { TExoChildrenPort } from '../ports/types/TExoChildrenPort';
import type { TExoEventPort } from '../ports/types/TExoEventPort';
import type { TExoRefPort } from '../ports/types/TExoRefPort';
import type { TExoCursorDeclaration } from '../types/TExoCursorDeclaration';
import type { TExoEmitter } from '../types/TExoEmitter';
import type { TExoTextPort } from '../ports/types/TExoTextPort';

export type TExoShapeText = { readonly text: string };

export type TExoShapeNode = {
    readonly tag: string;
    readonly attrs: string[];
    readonly attrPorts: TExoAnyPort[];
    content: TExoAnyPort | null;
    readonly kids: (TExoShapeNode | TExoShapeText | TExoAnyPort)[];
};

function makeNode(tag: string): TExoShapeNode {
    return { tag, attrs: [], attrPorts: [], content: null, kids: [] };
}

export function exoSchemaShape(schema: TExoCursorDeclaration): TExoShapeNode {
    harvestExoSchema(schema);
    const holder = makeNode('#holder');
    const replay = new ExoShapeEmitter(schema, holder);
    schema.build(replay);
    return holder.kids[0] as TExoShapeNode;
}

class ExoShapeEmitter implements TExoEmitter {
    private readonly supply: readonly TExoAnyPort[];
    private readonly taken: { at: number };
    private node: TExoShapeNode;

    constructor(schema: TExoCursorDeclaration, holder: TExoShapeNode, taken?: { at: number }) {
        this.supply = schema.portList;
        this.taken = taken ?? { at: schema.declaredPorts };
        this.node = holder;
        this.schema = schema;
    }

    private readonly schema: TExoCursorDeclaration;

    private minted<TPort extends TExoAnyPort>(): TPort {
        const port = this.supply[this.taken.at];
        this.taken.at++;
        return port as TPort;
    }

    el(
        tag: string,
        attrs?: Readonly<Record<string, unknown>> | null,
        fn?: (emitter: TExoEmitter) => void
    ): this {
        const parent = this.node;
        const child = makeNode(tag);
        if (attrs !== undefined && attrs !== null) {
            for (const name in attrs) child.attrs.push(name, String(attrs[name]));
        }
        parent.kids.push(child);
        if (fn !== undefined) {
            this.node = child;
            fn(this);
            this.node = parent;
        }
        return this;
    }

    fork(): ExoShapeEmitter {
        return new ExoShapeEmitter(this.schema, this.node, this.taken);
    }

    text(value: unknown): this {
        this.node.kids.push({ text: String(value) });
        return this;
    }

    private placed<TPort extends TExoAnyPort>(port: TPort): TPort {
        this.node.attrPorts.push(port);
        return port;
    }

    attrPort(port: TExoAttrPort, name: string): TExoAttrPort;
    attrPort(name: string, portName?: string): TExoAttrPort;
    attrPort(first: TExoAttrPort | string): TExoAttrPort {
        return this.placed(typeof first === 'string' ? this.minted<TExoAttrPort>() : first);
    }

    stringPort(port: TExoAttrPort, name: string): TExoAttrPort;
    stringPort(name: string, portName?: string): TExoAttrPort;
    stringPort(first: TExoAttrPort | string): TExoAttrPort {
        return this.placed(typeof first === 'string' ? this.minted<TExoAttrPort>() : first);
    }

    togglePort(port: TExoAttrPort, name: string): TExoAttrPort;
    togglePort(name: string, portName?: string): TExoAttrPort;
    togglePort(first: TExoAttrPort | string): TExoAttrPort {
        return this.placed(typeof first === 'string' ? this.minted<TExoAttrPort>() : first);
    }

    port(name: string, portName?: string): TExoAttrPort {
        return this.attrPort(name, portName);
    }

    eventPort(port: TExoEventPort, name: string): TExoEventPort;
    eventPort(name: string, portName?: string): TExoEventPort;
    eventPort(first: TExoEventPort | string): TExoEventPort {
        return this.placed(typeof first === 'string' ? this.minted<TExoEventPort>() : first);
    }

    refPort(port: TExoRefPort): TExoRefPort;
    refPort(portName?: string): TExoRefPort;
    refPort(given?: TExoRefPort | string): TExoRefPort {
        return this.placed(
            given === undefined || typeof given === 'string' ? this.minted<TExoRefPort>() : given
        );
    }

    textPort(port: TExoTextPort): TExoTextPort;
    textPort(portName?: string): TExoTextPort;
    textPort(given?: TExoTextPort | string): TExoTextPort {
        const port =
            given === undefined || typeof given === 'string' ? this.minted<TExoTextPort>() : given;
        this.node.content = port;
        return port;
    }

    childrenPort(port: TExoChildrenPort): TExoChildrenPort;
    childrenPort(portName?: string): TExoChildrenPort;
    childrenPort(given?: TExoChildrenPort | string): TExoChildrenPort {
        const port =
            given === undefined || typeof given === 'string'
                ? this.minted<TExoChildrenPort>()
                : given;
        this.node.kids.push(port);
        return port;
    }
}
