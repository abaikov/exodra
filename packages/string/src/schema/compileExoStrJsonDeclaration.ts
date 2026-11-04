import {
    EXO_PORT_ATTR,
    EXO_PORT_ATTR_STRING,
    EXO_PORT_ATTR_TOGGLE,
    EXO_PORT_CHILDREN,
    EXO_PORT_EVENT,
    EXO_PORT_REF,
    EXO_PORT_TEXT,
    EXO_RAW_TEXT_ELEMENTS,
    EXO_VOID_ELEMENTS,
    assertExoParserStableChild,
    assertExoParserStableText,
    EXO_HTML_NS,
    EXO_MATHML_NS,
    EXO_SVG_NS,
    assertExoOneRoot,
    assertExoRootElement,
    mintExoPort,
    escapeExoAttributeValue,
    escapeExoText,
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
import { EXO_NEWLINE_EATING_ELEMENTS } from './constants/EXO_NEWLINE_EATING_ELEMENTS';
import { exoMarkupFillOrder } from '../markup/exoMarkupFillOrder';
import type { TExoStrJsonDeclaration } from './types/TExoStrJsonDeclaration';
import type { TExoStrWriterDeclaration } from './types/TExoStrWriterDeclaration';

/**
 * One element while it is OPEN. The stack of these is the JS call stack of `el`, and what an
 * element only knows once its children have gone by — whether a children port is its ONLY child,
 * and where its start tag ends when an attribute port arrives after them — is patched on close.
 */
type TExoStrFrame = {
    readonly tag: string;
    readonly rawText: boolean;
    readonly eatsLeadingNewline: boolean;
    readonly isVoid: boolean;
    startTagOpen: boolean;
    endOfStartTagPiece: number;
    endOfStartTagOffset: number;
    kids: number;
    soleChildPort: number;
    soleChildEatsNewline: boolean;
    afterRegion: boolean;
    lastNode: number;
    pendingText: string;
    lower: string;
    kidsNs: string;
};

const NO_NODE = 0;
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const LINE_FEED = 10;

function createFrame(tag: string, kidsNs: string = EXO_HTML_NS): TExoStrFrame {
    const lower = tag.toLowerCase();
    return {
        tag,
        lower,
        kidsNs,
        rawText: EXO_RAW_TEXT_ELEMENTS.has(lower),
        eatsLeadingNewline: EXO_NEWLINE_EATING_ELEMENTS.has(lower),
        isVoid: EXO_VOID_ELEMENTS.has(tag),
        startTagOpen: true,
        endOfStartTagPiece: -1,
        endOfStartTagOffset: -1,
        kids: 0,
        soleChildPort: -1,
        soleChildEatsNewline: false,
        afterRegion: false,
        lastNode: NO_NODE,
        pendingText: '',
    };
}

class ExoStrEmitter implements TExoEmitter {
    readonly pieces: string[] = [];
    /** By piece: the port filled after it. The DECLARATION numbers ports, the markup places them. */
    readonly order: number[] = [];
    readonly writers: TExoStrWriterDeclaration[];
    readonly roots: string[] = [];
    rootTag: string | null = null;
    private readonly supply: TExoAnyPort[];
    private next: number;
    private current = '';
    private frame: TExoStrFrame;
    private readonly holder: TExoStrFrame;

    constructor(schema: TExoCursorDeclaration) {
        this.writers = new Array<TExoStrWriterDeclaration>(schema.portList.length);
        this.supply = schema.portList;
        this.next = schema.declaredPorts;
        this.holder = createFrame('#holder');
        this.holder.startTagOpen = false;
        this.frame = this.holder;
    }

    run(schema: TExoCursorDeclaration): void {
        schema.build(this);
        assertExoOneRoot(this.roots);
        assertExoRootElement(this.rootTag);
        this.pieces.push(this.current);
        this.current = '';
        const writers = this.writers;
        writers.length = schema.portList.length;
        const unplaced: TExoStrWriterDeclaration = { writer: 'event' };
        for (let i = 0; i < writers.length; i++) {
            if (writers[i] === undefined) writers[i] = unplaced;
        }
    }

    private minted<TPort extends TExoAnyPort>(
        kind: TExoAnyPort['kind'],
        name: string | null
    ): TPort {
        return mintExoPort<TPort>(this.supply, this.next++, kind, name);
    }

    private mintedOrNamed<TPort extends TExoAttrPort | TExoEventPort>(
        kind: TPort['kind'],
        first: TPort | string,
        second: string | undefined
    ): TPort {
        return typeof first === 'string'
            ? this.minted<TPort>(kind, first)
            : nameExoPort(first, second as string);
    }

    private mintedOrGiven<TPort extends TExoAnyPort>(
        kind: TPort['kind'],
        given: TPort | string | undefined
    ): TPort {
        return given === undefined || typeof given === 'string'
            ? this.minted<TPort>(kind, null)
            : given;
    }

    private refuseVoidContent(tag: string): void {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `compileExoStrSchema: <${tag}> is a void element and cannot have content` +
                  ' — the parser closes it for you and prints no end tag, so ' +
                  `this backend would emit \`</${tag}>\` and a browser would re-parse ` +
                  `it into a SECOND <${tag}>, while @exodra/dom drops the content ` +
                  'instead: one schema, two pages. Put the content in a sibling element.'
                : 'EXO0060'
        );
    }

    private closeStartTag(): void {
        const frame = this.frame;
        if (!frame.startTagOpen) return;
        frame.startTagOpen = false;
        frame.endOfStartTagPiece = this.pieces.length;
        frame.endOfStartTagOffset = this.current.length;
        this.current += '>';
    }

    private flushText(): void {
        const frame = this.frame;
        const run = frame.pendingText;
        if (run === '') return;
        frame.pendingText = '';
        assertExoParserStableText(frame.lower, run);
        // With no row between them the parser would merge this run into the Text before the region,
        // or eat its newline; `compileExoDomSchema` builds the same comment into its prototype.
        if (
            frame.afterRegion &&
            (frame.lastNode === TEXT_NODE ||
                (frame.eatsLeadingNewline &&
                    frame.lastNode === NO_NODE &&
                    run.charCodeAt(0) === LINE_FEED))
        ) {
            this.current += '<!---->';
        }
        frame.afterRegion = false;
        frame.lastNode = TEXT_NODE;
        this.current += run;
    }

    private cut(index: number, writer: TExoStrWriterDeclaration): void {
        this.writers[index] = writer;
        this.pieces.push(this.current);
        this.order.push(index);
        this.current = '';
    }

    /**
     * An attribute declared after a child: its bytes belong inside a start tag already printed, so
     * the piece holding that `>` is split in two and the port takes the seam.
     */
    private cutIntoStartTag(index: number, writer: TExoStrWriterDeclaration): void {
        const frame = this.frame;
        if (frame.startTagOpen) {
            this.cut(index, writer);
            return;
        }
        this.writers[index] = writer;
        const at = frame.endOfStartTagPiece;
        const offset = frame.endOfStartTagOffset;
        if (at === this.pieces.length) {
            this.pieces.push(this.current.slice(0, offset));
            this.order.push(index);
            this.current = this.current.slice(offset);
        } else {
            const piece = this.pieces[at];
            this.pieces[at] = piece.slice(0, offset);
            this.pieces.splice(at + 1, 0, piece.slice(offset));
            this.order.splice(at, 0, index);
        }
        frame.endOfStartTagPiece = at + 1;
        frame.endOfStartTagOffset = 0;
    }

    private openKid(): TExoStrFrame {
        const frame = this.frame;
        if (frame.isVoid) this.refuseVoidContent(frame.tag);
        this.closeStartTag();
        this.flushText();
        return frame;
    }

    el(
        tag: string,
        attrs?: Readonly<Record<string, unknown>> | null,
        fn?: (emitter: TExoEmitter) => void
    ): this {
        const parent = this.openKid();
        if (parent === this.holder) {
            this.roots.push(`<${tag}>`);
            if (this.rootTag === null) this.rootTag = tag;
        }
        parent.kids++;
        parent.afterRegion = false;
        parent.lastNode = ELEMENT_NODE;
        // THE ONE PATH IN THIS LIBRARY WHOSE BYTES MEET A PARSER, so it is the path that has to ask:
        // a browser reading what this compiler prints applies the reshaping rules, and a schema the
        // parser would move served a page whose ports land on the wrong nodes with nothing thrown.
        const lower = tag.toLowerCase();
        const inHtml = parent.kidsNs === EXO_HTML_NS;
        assertExoParserStableChild(parent === this.holder ? null : parent.lower, lower, inHtml);
        const kidsNs = !inHtml
            ? parent.kidsNs
            : lower === 'svg'
            ? EXO_SVG_NS
            : lower === 'math'
            ? EXO_MATHML_NS
            : EXO_HTML_NS;
        this.current += '<' + tag;
        if (attrs !== undefined && attrs !== null) {
            for (const name in attrs) {
                this.current +=
                    ' ' + name + '="' + escapeExoAttributeValue(String(attrs[name])) + '"';
            }
        }
        const frame = createFrame(tag, kidsNs);
        this.frame = frame;
        if (fn !== undefined) fn(this);
        this.closeStartTag();
        if (!frame.isVoid) {
            this.flushText();
            if (frame.kids === 1 && frame.soleChildPort >= 0) {
                this.writers[frame.soleChildPort] = {
                    writer: 'children',
                    ownsElement: true,
                    eatsLeadingNewline: frame.soleChildEatsNewline,
                };
            }
            this.current += '</' + tag + '>';
        }
        this.frame = parent;
        return this;
    }

    text(value: unknown): this {
        const frame = this.frame;
        if (frame === this.holder) {
            this.roots.push(`the static text ${JSON.stringify(String(value))}`);
        }
        if (frame.isVoid) this.refuseVoidContent(frame.tag);
        this.closeStartTag();
        frame.kids++;
        // MERGED because the parser merges the run into ONE Text node. Inside a raw-text element it
        // is NOT escaped — a Text node's data serialises as it stands, so escaping makes `.a > .b`
        // a CSS rule matching nothing.
        const text = String(value);
        frame.pendingText += frame.rawText ? text : escapeExoText(text);
        return this;
    }

    attrPort(port: TExoAttrPort, name: string): TExoAttrPort;
    attrPort(name: string, portName?: string): TExoAttrPort;
    attrPort(first: TExoAttrPort | string, second?: string): TExoAttrPort {
        const port = this.mintedOrNamed<TExoAttrPort>(EXO_PORT_ATTR, first, second);
        const name = typeof first === 'string' ? first : (second as string);
        // The head ` name="` is NOT baked in: baked, it prints unconditionally, so an UNFILLED
        // port would serve ` class=""` where `@exodra/dom` shows no attribute.
        this.cutIntoStartTag(port.index, { writer: 'attribute', name, tag: this.frame.tag });
        return port;
    }

    stringPort(port: TExoAttrPort, name: string): TExoAttrPort;
    stringPort(name: string, portName?: string): TExoAttrPort;
    stringPort(first: TExoAttrPort | string, second?: string): TExoAttrPort {
        const port = this.mintedOrNamed<TExoAttrPort>(EXO_PORT_ATTR_STRING, first, second);
        const name = typeof first === 'string' ? first : (second as string);
        this.cutIntoStartTag(port.index, { writer: 'stringAttr', name });
        return port;
    }

    togglePort(port: TExoAttrPort, name: string): TExoAttrPort;
    togglePort(name: string, portName?: string): TExoAttrPort;
    togglePort(first: TExoAttrPort | string, second?: string): TExoAttrPort {
        const port = this.mintedOrNamed<TExoAttrPort>(EXO_PORT_ATTR_TOGGLE, first, second);
        const name = typeof first === 'string' ? first : (second as string);
        this.cutIntoStartTag(port.index, { writer: 'toggleAttr', name });
        return port;
    }

    port(name: string, portName?: string): TExoAttrPort {
        return this.attrPort(name, portName);
    }

    eventPort(port: TExoEventPort, name: string): TExoEventPort;
    eventPort(name: string, portName?: string): TExoEventPort;
    eventPort(first: TExoEventPort | string, second?: string): TExoEventPort {
        const port = this.mintedOrNamed<TExoEventPort>(EXO_PORT_EVENT, first, second);
        // Emits nothing and still CUTS: `@exodra/dom` shares the numbering, and an empty piece
        // between two static runs is just the two runs joined.
        this.cutIntoStartTag(port.index, { writer: 'event' });
        return port;
    }

    refPort(port: TExoRefPort): TExoRefPort;
    refPort(portName?: string): TExoRefPort;
    refPort(given?: TExoRefPort | string): TExoRefPort {
        const port = this.mintedOrGiven<TExoRefPort>(EXO_PORT_REF, given);
        this.cutIntoStartTag(port.index, { writer: 'ref' });
        return port;
    }

    textPort(port: TExoTextPort): TExoTextPort;
    textPort(portName?: string): TExoTextPort;
    textPort(given?: TExoTextPort | string): TExoTextPort {
        const frame = this.openKid();
        const port = this.mintedOrGiven<TExoTextPort>(EXO_PORT_TEXT, given);
        this.cut(port.index, {
            writer: 'text',
            eatsLeadingNewline: frame.eatsLeadingNewline && frame.kids === 0,
        });
        return port;
    }

    childrenPort(port: TExoChildrenPort): TExoChildrenPort;
    childrenPort(portName?: string): TExoChildrenPort;
    childrenPort(given?: TExoChildrenPort | string): TExoChildrenPort {
        if (this.frame === this.holder) this.roots.push('a children port');
        const frame = this.openKid();
        const port = this.mintedOrGiven<TExoChildrenPort>(EXO_PORT_CHILDREN, given);
        // Whether this port OWNS its element is not known until the element closes, so it is
        // written here as one that shares it and patched there if nothing else arrived.
        const eats = frame.eatsLeadingNewline && frame.kids === 0;
        if (frame.kids === 0) {
            frame.soleChildPort = port.index;
            frame.soleChildEatsNewline = eats;
        }
        frame.kids++;
        frame.afterRegion = true;
        this.cut(port.index, { writer: 'children', ownsElement: false, eatsLeadingNewline: eats });
        return port;
    }
}

// The markup function runs against THIS emitter, which writes down the static pieces and which writer
// each port takes; `createExoStrSchema` turns that into the schema a render reads.
export function compileExoStrJsonDeclaration(
    schema: TExoCursorDeclaration
): TExoStrJsonDeclaration {
    const emitter = new ExoStrEmitter(schema);
    emitter.run(schema);
    return {
        pieces: emitter.pieces,
        order: exoMarkupFillOrder(emitter.order, emitter.pieces.length - 1),
        writers: emitter.writers,
    };
}
