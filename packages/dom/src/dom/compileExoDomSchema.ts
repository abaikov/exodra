import { createExoIntTable } from './factories/createExoIntTable';
import {
    EXO_PORT_ATTR,
    EXO_PORT_ATTR_STRING,
    EXO_PORT_ATTR_TOGGLE,
    EXO_PORT_CHILDREN,
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    EXO_PORT_REF,
    EXO_VOID_ELEMENTS,
    assertExoNoTextAfterChildrenPort,
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
import { EXO_ADOPT_STOP_PARENT_END } from './constants/EXO_ADOPT_STOP_PARENT_END';
import { EXO_ADOPT_STOP_UNKNOWN } from './constants/EXO_ADOPT_STOP_UNKNOWN';
import { EXO_HTML_NS, EXO_MATHML_NS, EXO_SVG_NS } from '@exodra/core';
import { EXO_SVG_ONLY_TAGS } from './constants/EXO_SVG_ONLY_TAGS';
import type { TExoForeignNamespaces } from './types/TExoForeignNamespaces';
import { EXO_NEWLINE_EATING_TAGS } from './constants/EXO_NEWLINE_EATING_TAGS';
import { EXO_WALK_FIRST_CHILD } from './constants/EXO_WALK_FIRST_CHILD';
import { EXO_WALK_FROM_END } from './constants/EXO_WALK_FROM_END';
import { EXO_WALK_NEXT_SIBLING } from './constants/EXO_WALK_NEXT_SIBLING';
import { assertExoContentBeside } from './asserts/assertExoContentBeside';
import { assertExoVoidContent } from './asserts/assertExoVoidContent';
import { disposeExoChildSelf } from './factories/createExoDomChildFactory';
import { cloneExoNode } from '../backend/cloneExoNode';
import { exoUnsettableSharedContent } from './constants/exoUnsettableSharedContent';
import { exoUnsettableRef } from './constants/exoUnsettableRef';
import { exoUnsettableEvent } from './constants/exoUnsettableEvent';
import { setExoHtml } from './setExoHtml';
import type { TExoDomApi } from './types/TExoDomApi';
import type { TExoDomSchema } from './types/TExoDomSchema';
import type { TExoDomSetter } from './types/TExoDomSetter';
import type { TExoParserStability } from './types/TExoParserStability';

const TEXT_NODE = 3;

const LINE_FEED = 10;

const NO_UNREACHABLE: readonly number[] = [];

// Shared by the six tables a schema with no children port has no row for: an index is out of range.
const NO_CHILD_LISTS = Object.freeze([]) as unknown as number[];

// The same answer for the schema where no port is its element's whole content.
const NO_OWNERS = Object.freeze([]) as unknown as number[];

// Stands in `elem` until `finish` cuts the real one: nothing reads a table before the build ends.
const NO_PORTS = Object.freeze([]) as unknown as number[];

const NO_LANDINGS: number[] = [];

// One child list, as it is recorded while the port count is still moving: six of the schema's tables
// have a row here instead, and `finish` scatters them into the port-indexed arrays at once.
const LIST_PORT = 0;
const LIST_START = 1;
const LIST_END = 2;
const LIST_NEXT = 3;
const LIST_PREV = 4;
const LIST_PREV_STATICS = 5;
const LIST_STOP = 6;
const LIST_STRIDE = 7;

/**
 * One element while it is OPEN, and the stack of them is the JS call stack of `el`. Everything an
 * element only knows once its children have gone by is PATCHED HERE at its close: whether a
 * children port is its only child, how far back from the end a landing behind a child list stands,
 * and whether that landing is the last one — the three answers a tree used to hand over for free.
 */
type TExoDomFrame = {
    readonly parent: TExoDomFrame | null;
    readonly indexInParent: number;
    readonly tag: string;
    readonly lower: string;
    readonly el: Node;
    readonly kidsNs: string;
    readonly isVoid: boolean;
    readonly eatsNewline: boolean;
    readonly made: Node[];
    slot: number;
    landingAt: number;
    domIndex: number;
    rawKids: number;
    contentPort: number;
    pendingText: string;
    lastSlot: number;
    lastIndex: number;
    lastElementIndex: number;
    pendingRows: number[] | null;
    lastPort: number;
    staticsSince: number;
    soleChildPort: number;
    startShifted: boolean;
    shiftedRows: number[] | null;
    landings: number[];
    candidateLanding: number;
    candidateHydrateStart: number;
    candidateHydrateEnd: number;
    candidateDomIndex: number;
    candidateRows: number[] | null;
};

function createFrame(
    parent: TExoDomFrame | null,
    indexInParent: number,
    tag: string,
    lower: string,
    el: Node,
    kidsNs: string
): TExoDomFrame {
    return {
        parent,
        indexInParent,
        tag,
        lower,
        el,
        kidsNs,
        isVoid: EXO_VOID_ELEMENTS.has(tag),
        eatsNewline: EXO_NEWLINE_EATING_TAGS.has(lower),
        made: [],
        slot: -1,
        landingAt: -1,
        domIndex: 0,
        rawKids: 0,
        contentPort: -1,
        pendingText: '',
        lastSlot: -1,
        lastIndex: 0,
        lastElementIndex: -1,
        pendingRows: null,
        lastPort: -1,
        staticsSince: 0,
        soleChildPort: -1,
        startShifted: false,
        shiftedRows: null,
        landings: NO_LANDINGS,
        candidateLanding: -1,
        candidateHydrateStart: -1,
        candidateHydrateEnd: -1,
        candidateDomIndex: -1,
        candidateRows: null,
    };
}

// Refused by name rather than built in the HTML namespace when no pack knows SVG or MathML.
function refuseExoForeignElement(lower: string): void {
    if (lower !== 'svg' && lower !== 'math' && !EXO_SVG_ONLY_TAGS.has(lower)) return;
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `createExoSchema(dom): <${lower}> is SVG or MathML, and this backend was composed ` +
              'without withExoForeignNamespaces — compose it once, at module level: ' +
              '`withExoForeignNamespaces(withExoCompiler(new ExoDomBackend()))`.'
            : `EXO0108 "${lower}"`
    );
}

class ExoDomEmitter implements TExoEmitter {
    readonly walk: number[] = [];
    readonly hydrateWalk: number[] = [];
    readonly probe: Node[] = [];
    readonly unreachable: number[] = [];
    readonly roots: string[] = [];
    elem: number[] = NO_PORTS;
    childListStartSlot: number[] = NO_CHILD_LISTS;
    childListEndSlot: number[] = NO_CHILD_LISTS;
    childListNextPort: number[] = NO_CHILD_LISTS;
    childListPrevPort: number[] = NO_CHILD_LISTS;
    childListPrevStatics: number[] = NO_CHILD_LISTS;
    adoptStopSlot: number[] = NO_CHILD_LISTS;
    ownsElement: number[] = NO_OWNERS;
    slots = 1;
    anyFromEnd = false;
    hasAdjacentChildLists = false;
    hasSeparatedChildLists = false;
    proto: Element | null = null;
    rootTag: string | null = null;

    private readonly schema: TExoCursorDeclaration;
    private readonly doc: Document;
    private readonly holder: HTMLTemplateElement;
    private readonly parserStability: TExoParserStability | undefined;
    private readonly foreign: TExoForeignNamespaces | undefined;
    private rootNs = '';
    private readonly supply: TExoAnyPort[];
    private next: number;
    private frame: TExoDomFrame | null = null;
    private loose: TExoDomFrame | null = null;
    // Appended to as ports are placed, and cut into the port-indexed tables once in `finish`: the
    // port count is not known until the markup has run, and `portList` is as long as the LAST
    // compile of this schema left it — which is where a count survives from one backend to another.
    private readonly portSlots: number[];
    private owned: number[] | null = null;
    private childLists: number[] | null = null;

    constructor(
        schema: TExoCursorDeclaration,
        doc: Document,
        holder: HTMLTemplateElement,
        parserStability: TExoParserStability | undefined,
        foreign: TExoForeignNamespaces | undefined
    ) {
        this.schema = schema;
        this.doc = doc;
        this.holder = holder;
        this.parserStability = parserStability;
        this.foreign = foreign;
        this.supply = schema.portList;
        this.next = schema.declaredPorts;
        const known = schema.portList.length;
        this.portSlots = known === 0 ? [] : new Array<number>(known).fill(0);
    }

    /**
     * The port-indexed tables, allocated ONCE each and at their final length — possible only
     * because none of them existed while the count was still moving. A schema that MINTS its ports
     * therefore pays what one that DECLARES them pays; what a second compile saves is the
     * appending, not an allocation.
     */
    finish(count: number): void {
        const portSlots = this.portSlots;
        const elem = createExoIntTable(count, 0);
        const placed = portSlots.length < count ? portSlots.length : count;
        for (let i = 0; i < placed; i++) elem[i] = portSlots[i];
        this.elem = elem;
        const owned = this.owned;
        if (owned !== null) {
            const ownsElement = createExoIntTable(count, 0);
            for (let p = 0; p < owned.length; p++) ownsElement[owned[p]] = 1;
            this.ownsElement = ownsElement;
        }
        const rows = this.childLists;
        if (rows === null) return;
        const startSlot = createExoIntTable(count, -1);
        const endSlot = createExoIntTable(count, -1);
        const nextPort = createExoIntTable(count, -1);
        const prevPort = createExoIntTable(count, -1);
        const prevStatics = createExoIntTable(count, 0);
        const stopSlot = createExoIntTable(count, EXO_ADOPT_STOP_UNKNOWN);
        for (let row = 0; row < rows.length; row += LIST_STRIDE) {
            const port = rows[row + LIST_PORT];
            startSlot[port] = rows[row + LIST_START];
            endSlot[port] = rows[row + LIST_END];
            nextPort[port] = rows[row + LIST_NEXT];
            prevPort[port] = rows[row + LIST_PREV];
            prevStatics[port] = rows[row + LIST_PREV_STATICS];
            stopSlot[port] = rows[row + LIST_STOP];
        }
        this.childListStartSlot = startSlot;
        this.childListEndSlot = endSlot;
        this.childListNextPort = nextPort;
        this.childListPrevPort = prevPort;
        this.childListPrevStatics = prevStatics;
        this.adoptStopSlot = stopSlot;
    }

    private minted<TPort extends TExoAnyPort>(
        kind: TExoAnyPort['kind'],
        name: string | null
    ): TPort {
        return mintExoPort<TPort>(this.supply, this.next++, kind, name);
    }

    // Ports declared OUTSIDE the root element used to be left behind by the numbering walk and
    // keep the 0 their slot starts at. Kept exactly that way, and not turned into a refusal: a
    // refusal needs an error code, and a code needs a row on the published errors page.
    private standing(): TExoDomFrame {
        const frame = this.frame;
        if (frame !== null) return frame;
        const loose = (this.loose ??= createFrame(
            null,
            0,
            '#outside',
            '#outside',
            this.doc.createElement('div'),
            EXO_HTML_NS
        ));
        loose.slot = 0;
        return loose;
    }

    private openKid(): TExoDomFrame {
        const frame = this.standing();
        if (frame.isVoid) assertExoVoidContent(frame.tag);
        if (frame.contentPort >= 0) assertExoContentBeside(frame.tag);
        return frame;
    }

    private flushText(frame: TExoDomFrame): void {
        let run = frame.pendingText;
        if (run === '') return;
        frame.pendingText = '';
        // Refused in `@exodra/core`, so `compileExoStrSchema` refuses the same shape: rows insert
        // after the text here while the server prints them before it.
        if (frame.pendingRows !== null) assertExoNoTextAfterChildrenPort(frame.tag, run);
        // A browser eats this newline out of the server's bytes and nothing eats it here, so the
        // two pages would differ by a blank first line (`newline-eater-parity`).
        if (frame.eatsNewline && frame.domIndex === 0 && run.charCodeAt(0) === LINE_FEED) {
            run = run.slice(1);
        }
        if (run.length === 0) return;
        const stability = this.parserStability;
        if (stability !== undefined) stability.text(frame.lower, run);
        // Verbatim, with no escaper in front of it: escaping existed so a PARSER would decode the
        // author's characters back, and a `<script>` was exempt because raw text decodes nothing.
        // A Text node holds what it is given, in both elements alike.
        const text = this.doc.createTextNode(run);
        frame.el.appendChild(text);
        frame.made.push(text);
        frame.domIndex++;
    }

    /**
     * The slot this element's node lands on, ASKED FOR rather than handed down: an element nothing
     * asks about is an element no instance has to walk to, which is what `subtreeHoldsPorts` was
     * for. A port asks its own element, which asks its parent, up to the first one already there.
     */
    private slotOf(frame: TExoDomFrame): number {
        if (frame.slot >= 0) return frame.slot;
        const parent = frame.parent as TExoDomFrame;
        const slot = this.resolveChild(parent, frame.indexInParent);
        frame.slot = slot;
        frame.landingAt = parent.landings.length - 3;
        return slot;
    }

    private resolveChild(frame: TExoDomFrame, index: number): number {
        if (frame.lastSlot >= 0 && frame.lastIndex === index) return frame.lastSlot;
        const slot = this.slotOf(frame);
        const hydrateStart = this.hydrateWalk.length;
        let from = frame.lastSlot;
        let at = frame.lastIndex;
        if (from < 0) {
            from = this.slots++;
            this.walk.push(from, slot, EXO_WALK_FIRST_CHILD);
            this.hydrateWalk.push(from, slot, EXO_WALK_FIRST_CHILD);
            this.probe[from] = frame.made[0];
            at = 0;
        }
        for (; at < index; at++) {
            const next = this.slots++;
            this.walk.push(next, from, EXO_WALK_NEXT_SIBLING);
            this.hydrateWalk.push(next, from, EXO_WALK_NEXT_SIBLING);
            this.probe[next] = frame.made[at + 1];
            from = next;
        }
        frame.lastSlot = from;
        frame.lastIndex = index;
        const pending = frame.pendingRows;
        if (frame.landings === NO_LANDINGS) frame.landings = [];
        const landingAt = frame.landings.length;
        frame.landings.push(from, this.slots, pending === null ? 0 : 1);
        if (pending !== null) {
            const rows = this.childLists as number[];
            for (let p = 0; p < pending.length; p++) rows[pending[p] + LIST_END] = from;
            frame.pendingRows = null;
            // A landing behind a child list is only resolvable from the parent's END, and only
            // when NOTHING dynamic follows it — which this element learns at its close. Recorded
            // as the candidate and written as an ordinary landing until then.
            frame.candidateLanding = landingAt;
            frame.candidateHydrateStart = hydrateStart;
            frame.candidateHydrateEnd = this.hydrateWalk.length;
            frame.candidateDomIndex = index;
            frame.candidateRows = pending;
            frame.startShifted = true;
        }
        return from;
    }

    private closeFrame(frame: TExoDomFrame): void {
        const candidate = frame.candidateLanding;
        if (candidate >= 0) {
            const group = frame.candidateRows as number[];
            const landing = frame.landings[candidate];
            const back = frame.domIndex - 1 - frame.candidateDomIndex;
            this.hydrateWalk.splice(
                frame.candidateHydrateStart,
                frame.candidateHydrateEnd - frame.candidateHydrateStart,
                landing,
                frame.slot,
                EXO_WALK_FROM_END + back
            );
            this.anyFromEnd = true;
            // Only where hydration can find it: a wrong boundary stops loops and removes nodes,
            // which is worse than none.
            const rows = this.childLists as number[];
            for (let p = 0; p < group.length; p++) rows[group[p] + LIST_STOP] = landing;
        }
        const landings = frame.landings;
        let lastUnreachable = false;
        for (let k = 0; k < landings.length; k += 3) {
            const here: boolean = k !== candidate && (landings[k + 2] === 1 || lastUnreachable);
            if (here) this.unreachable.push(landings[k], landings[k + 1]);
            lastUnreachable = here;
        }
        const pending = frame.pendingRows;
        if (pending !== null) {
            const rows = this.childLists as number[];
            for (let p = 0; p < pending.length; p++) {
                rows[pending[p] + LIST_END] = -1;
                rows[pending[p] + LIST_STOP] = EXO_ADOPT_STOP_PARENT_END;
            }
        }
        // Only the shifted lists that took no preceding port are recorded, so the test the row used
        // to be re-read for is already spent by the time one lands here.
        const shifted = frame.shiftedRows;
        if (shifted !== null) {
            const rows = this.childLists as number[];
            for (let p = 0; p < shifted.length; p++) {
                rows[shifted[p] + LIST_STOP] = EXO_ADOPT_STOP_UNKNOWN;
            }
        }
        // `set(port, markup)` takes the whole element, so it is offered only where the port IS the
        // whole element — a count nothing but the closing tag can settle.
        if (frame.rawKids === 1 && frame.soleChildPort >= 0) {
            (this.owned ??= []).push(frame.soleChildPort);
        }
        const parent = frame.parent;
        if (parent !== null && frame.landingAt >= 0)
            parent.landings[frame.landingAt + 1] = this.slots;
    }

    el(
        tag: string,
        attrs?: Readonly<Record<string, unknown>> | null,
        fn?: (emitter: TExoEmitter) => void
    ): this {
        const parent = this.frame;
        const lower = tag.toLowerCase();
        const stability = this.parserStability;
        const foreign = this.foreign;
        if (foreign === undefined) refuseExoForeignElement(lower);
        let ns: string;
        let index = 0;
        if (parent === null) {
            this.roots.push(`<${tag}>`);
            // The root's NAMESPACE is settled from the tag the moment it arrives, because nothing
            // before this call knows it: the markup is not replayed to find out.
            if (this.rootTag === null) {
                this.rootTag = tag;
                this.rootNs =
                    foreign === undefined ? EXO_HTML_NS : foreign.rootNamespace(this.schema, lower);
            }
            ns = this.rootNs;
            if (stability !== undefined) stability.child(null, lower, ns === EXO_HTML_NS);
        } else {
            if (parent.isVoid) assertExoVoidContent(parent.tag);
            if (parent.contentPort >= 0) assertExoContentBeside(parent.tag);
            this.flushText(parent);
            parent.rawKids++;
            const inHtml = parent.kidsNs === EXO_HTML_NS;
            if (stability !== undefined) stability.child(parent.lower, lower, inHtml);
            ns = !inHtml
                ? parent.kidsNs
                : lower === 'svg'
                ? EXO_SVG_NS
                : lower === 'math'
                ? EXO_MATHML_NS
                : EXO_HTML_NS;
            index = parent.domIndex;
        }
        const el =
            ns === EXO_HTML_NS
                ? this.doc.createElement(tag)
                : (foreign as TExoForeignNamespaces).createElement(this.doc, lower, ns);
        if (attrs !== undefined && attrs !== null) {
            for (const name in attrs) putExoAttr(el, name, String(attrs[name]), ns, foreign);
        }
        const frame = createFrame(
            parent,
            index,
            tag,
            lower,
            el,
            ns === EXO_HTML_NS ||
                (foreign as TExoForeignNamespaces).htmlIntegrationPoint(ns, lower, attrs)
                ? EXO_HTML_NS
                : ns
        );
        if (parent === null) {
            if (this.proto === null) {
                this.proto = el;
                this.holder.content.appendChild(el);
                this.probe[0] = el;
            }
            // Everything after the first root is dropped from the prototype, which is what
            // `createExoSchema` refuses by name; its callback still runs, so the port numbers this
            // replay consumes stay in step with the ones the declaration handed out.
            frame.slot = 0;
        } else {
            parent.el.appendChild(el);
            parent.made.push(el);
            parent.domIndex = index + 1;
            parent.lastElementIndex = index;
            // A static bounding a child list is resolved though nothing fills it: rows insert
            // before the closing one, and the opening one is adoption's only landmark.
            if (parent.pendingRows !== null) this.slotOf(frame);
        }
        this.frame = frame;
        if (fn !== undefined) fn(this);
        this.flushText(frame);
        this.closeFrame(frame);
        if (parent !== null) parent.staticsSince++;
        this.frame = parent;
        return this;
    }

    text(value: unknown): this {
        if (this.frame === null) {
            this.roots.push(`the static text ${JSON.stringify(String(value))}`);
        }
        const frame = this.openKid();
        frame.rawKids++;
        // MERGED because the parser merges the run into ONE Text node, and both compilers ask the
        // shared refusals of the whole run rather than of one call.
        frame.pendingText += String(value);
        return this;
    }

    private placeAttrPort(port: TExoAnyPort): void {
        const frame = this.standing();
        this.portSlots[port.index] = this.slotOf(frame);
        // Refused where the TAG is still in hand; the port loop below sees only the element the
        // schema built. NOTHING is written to the prototype for an attribute port: what a fill needs
        // to know about the name is computed from the element's namespace when its writer is
        // built, and an unfilled port must leave the element as bare as the server prints it.
        if (port.name === null) {
            throw new Error(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `createExoSchema(dom): a port among <${frame.tag}>'s attributes has no name` +
                      ' — only attribute and event ports belong there'
                    : 'EXO0037'
            );
        }
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
        this.portSlots[port.index] = this.slotOf(this.standing());
        return port;
    }

    refPort(port: TExoRefPort): TExoRefPort;
    refPort(portName?: string): TExoRefPort;
    refPort(given?: TExoRefPort | string): TExoRefPort {
        const port =
            given === undefined || typeof given === 'string'
                ? this.minted<TExoRefPort>(EXO_PORT_REF, null)
                : given;
        this.portSlots[port.index] = this.slotOf(this.standing());
        return port;
    }

    textPort(port: TExoTextPort): TExoTextPort;
    textPort(portName?: string): TExoTextPort;
    textPort(given?: TExoTextPort | string): TExoTextPort {
        const frame = this.standing();
        if (frame.isVoid) assertExoVoidContent(frame.tag);
        if (frame.rawKids > 0) assertExoContentBeside(frame.tag);
        const port =
            given === undefined || typeof given === 'string'
                ? this.minted<TExoTextPort>(EXO_PORT_TEXT, null)
                : given;
        this.portSlots[port.index] = this.slotOf(frame);
        frame.contentPort = port.index;
        // The NODE, with nothing in it: an unfilled text port must print nothing, and its writer
        // needs somewhere to store into before any instance exists.
        frame.el.appendChild(this.doc.createTextNode(''));
        return port;
    }

    childrenPort(port: TExoChildrenPort): TExoChildrenPort;
    childrenPort(portName?: string): TExoChildrenPort;
    childrenPort(given?: TExoChildrenPort | string): TExoChildrenPort {
        if (this.frame === null) this.roots.push('a children port');
        const frame = this.openKid();
        this.flushText(frame);
        const port =
            given === undefined || typeof given === 'string'
                ? this.minted<TExoChildrenPort>(EXO_PORT_CHILDREN, null)
                : given;
        const index = port.index;
        this.portSlots[index] = this.slotOf(frame);
        if (frame.lastElementIndex >= 0) this.resolveChild(frame, frame.lastElementIndex);
        const rows = (this.childLists ??= []);
        const row = rows.length;
        const separated = frame.lastPort >= 0 && frame.staticsSince > 0;
        rows.push(
            index,
            frame.lastSlot,
            -1,
            -1,
            separated ? frame.lastPort : -1,
            separated ? frame.staticsSince : 0,
            EXO_ADOPT_STOP_UNKNOWN
        );
        if (separated) this.hasSeparatedChildLists = true;
        if (frame.startShifted && !separated) (frame.shiftedRows ??= []).push(row);
        frame.lastPort = index;
        frame.staticsSince = 0;
        if (frame.rawKids === 0) frame.soleChildPort = index;
        frame.rawKids++;
        const pending = frame.pendingRows;
        if (pending !== null) {
            rows[pending[pending.length - 1] + LIST_NEXT] = index;
            this.hasAdjacentChildLists = true;
        }
        (frame.pendingRows ??= []).push(row);
        // A later child list means no landing in this element can count from the parent's end.
        frame.candidateLanding = -1;
        frame.candidateRows = null;
        return port;
    }
}

/**
 * Compile a declaration for the DOM. Its output is indexed BY NUMBER from outside this file: port
 * numbers are `@exodra/core`'s and `@exodra/string` uses the same ones, slot numbers are handed out
 * here as elements are asked for, and `wireExoInstance` fills `nodes` by appending. README,
 * "Compiled schemas".
 *
 * THE MARKUP IS RECEIVED, NOT WALKED. There is no schema tree: `createExoSchema` runs the markup
 * function once to number the ports and this file runs it again against an emitter of its own,
 * building the prototype with `createElement`/`createTextNode`/`appendChild` as the calls arrive.
 * The `TExoSchemaNode` tree that used to stand between them served this backend alone, and every
 * decision it answered by LOOKING AHEAD is patched at the element's close instead.
 *
 * THE PROTOTYPE IS BUILT, NOT PARSED. This used to emit a markup string, hand it to
 * `holder.innerHTML`, and then check three times over that the parser had not reshaped it — a walk
 * replay, a tag-per-landing loop and a whole-tree compare. Measured on a 52-node subject
 * (`packages/benchmarks`, axis `template-build`), building the tree costs 10.55 µs against 14.06 µs
 * for a parse of a READY-MADE string, and this file also paid to BUILD that string on top of the
 * parse.
 *
 * What the parse used to answer for free, and where each answer lives now: the NAMESPACE of foreign
 * content and the camel case inside it (`constants/exo-foreign-adjustments`, applied below), the
 * newline eaten after `<pre>` (the static-text branch), and the refusal of every shape the parser
 * moves — `backend.parserStability`, which only a backend composed with `withExoHydration`
 * carries, because a built tree cannot be reshaped and a client-only render meets no parser at all.
 */
export function compileExoDomSchema(
    declaration: TExoCursorDeclaration,
    backend: TExoDomApi
): TExoDomSchema {
    const events = backend.events;

    // A `<template>`, so every node is created in the inert template-contents document: no image
    // loads and no script runs at module load, and a clone still starts outside the page
    // (`proto-ownership.test.ts`).
    const holder = document.createElement('template');
    const doc = holder.content.ownerDocument ?? document;

    const emitter = new ExoDomEmitter(
        declaration,
        doc,
        holder,
        backend.parserStability,
        backend.foreignNamespaces
    );
    declaration.build(emitter);
    assertExoOneRoot(emitter.roots);
    assertExoRootElement(emitter.rootTag);
    const portList = declaration.portList;
    emitter.finish(portList.length);
    const proto = emitter.proto as Element;

    const walk = emitter.walk;
    const hydrateWalk = emitter.hydrateWalk;
    const probe = emitter.probe;
    const elem = emitter.elem;
    const adoptStopSlot = emitter.adoptStopSlot;
    const childListNextPort = emitter.childListNextPort;
    const childListPrevPort = emitter.childListPrevPort;
    const childListPrevStatics = emitter.childListPrevStatics;
    const ownsElement = emitter.ownsElement;
    const unreachable = emitter.unreachable;
    let hasSeparatedChildLists = emitter.hasSeparatedChildLists;

    // Two adjacent child lists can neither be bounded nor published from — their rows meet with
    // nothing between them. README, "Adoption between child lists".
    const adjacent = emitter.hasAdjacentChildLists
        ? createExoIntTable(childListNextPort.length, 0)
        : null;
    for (let i = 0; i < childListNextPort.length; i++) {
        const next = childListNextPort[i];
        if (next >= 0) {
            adoptStopSlot[i] = EXO_ADOPT_STOP_UNKNOWN;
            adoptStopSlot[next] = EXO_ADOPT_STOP_UNKNOWN;
            if (adjacent !== null) {
                adjacent[i] = 1;
                adjacent[next] = 1;
            }
        }
    }
    if (adjacent !== null && hasSeparatedChildLists) {
        hasSeparatedChildLists = false;
        for (let i = 0; i < childListPrevPort.length; i++) {
            const prev = childListPrevPort[i];
            if (prev < 0) continue;
            if (adjacent[prev] === 0) {
                hasSeparatedChildLists = true;
                continue;
            }
            childListPrevPort[i] = -1;
            childListPrevStatics[i] = 0;
            adoptStopSlot[i] = EXO_ADOPT_STOP_UNKNOWN;
        }
    }

    // Every child list is empty in the prototype, so front and back counts must land alike. Nothing
    // is parsed any more, so this is the FROM_END arithmetic checking itself against the tree the
    // same pass built — stripped in production, where the numbers cannot differ per process.
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        for (let i = 0; i < hydrateWalk.length; i += 3) {
            const from = probe[hydrateWalk[i + 1]];
            const op = hydrateWalk[i + 2];
            let landed: Node | null;
            if (op === EXO_WALK_FIRST_CHILD) landed = from.firstChild;
            else if (op === EXO_WALK_NEXT_SIBLING) landed = from.nextSibling;
            else {
                landed = from.lastChild;
                for (let back = op - EXO_WALK_FROM_END; back > 0 && landed !== null; back--) {
                    landed = landed.previousSibling;
                }
            }
            if (landed !== probe[hydrateWalk[i]]) {
                throw new Error(
                    'createExoSchema(dom): the hydration walk lands on a different node than the ' +
                        `render walk at slot ${hydrateWalk[i]} of <${declaration.rootTag}>'s own ` +
                        'prototype — the two must agree wherever no child list has rows in it.'
                );
            }
        }
    }

    // The setters last: three of the four kinds need the real element (`createExoAttrWrite`).
    const setters: TExoDomSetter[] = new Array(portList.length);
    // By port index: the datum its shared body is handed on every fill. An attribute's markup name,
    // a property's key, a namespace triple — out of the closure, so one body serves every port of
    // its kind in the process instead of one function object per attribute NAME.
    const writeData: unknown[] = new Array(portList.length).fill(null);
    const writers = backend.writers;
    // By port index: 1 where the prototype does not put that port's value into effect — the writers
    // pack's answer, not this file's.
    let markupMisses: number[] | null = null;
    let slots = emitter.slots;
    for (let i = 0; i < portList.length; i++) {
        const port = portList[i];
        const on = probe[elem[i]] as Element;
        if (port.kind === EXO_PORT_TEXT) {
            setters[i] = writers.text(on);
            if (!writers.markupCarries(null, on)) {
                if (markupMisses === null) markupMisses = createExoIntTable(portList.length, 0);
                markupMisses[i] = 1;
            }
            const placeholder = on.firstChild;
            // Appended past walk order because the writer is unknown until the prototype exists,
            // and to BOTH walks, which stay ONE table (`hydrate-walk-emission.test.ts` pins that).
            if (setters[i].takesTextNode === true) {
                if (placeholder === null || placeholder.nodeType !== TEXT_NODE) {
                    throw new Error(
                        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                            ? `createExoSchema(dom): the text port on <${on.localName}> has no Text ` +
                              'node in the prototype. Its writer has nothing to store into, and ' +
                              'the compiler puts one there for every text port — so a writers ' +
                              'pack removed it.'
                            : 'EXO0045'
                    );
                }
                const textSlot = slots++;
                walk.push(textSlot, elem[i], EXO_WALK_FIRST_CHILD);
                hydrateWalk.push(textSlot, elem[i], EXO_WALK_FIRST_CHILD);
                probe[textSlot] = placeholder;
                // The port keeps hydration's verdict as its slot moves to the Text node.
                for (let b = 0; b < unreachable.length; b += 2) {
                    if (elem[i] >= unreachable[b] && elem[i] < unreachable[b + 1]) {
                        unreachable.push(textSlot, textSlot + 1);
                        break;
                    }
                }
                elem[i] = textSlot;
            }
        } else if (port.kind === EXO_PORT_EVENT) {
            // The pack's own body is read off the PLAN on every fill (`on`), so the port keeps only
            // its datum here; the setter slot refuses, the way a ref port's does.
            setters[i] = exoUnsettableEvent;
            writeData[i] = events.port(named(port.name, 'an event'));
        } else if (port.kind === EXO_PORT_REF) {
            // A refusal, not a hole: a hole would widen `TExoDomSetter[]` and guard the hottest
            // line in a fill. `elem[i]` is a ref port's entire content.
            setters[i] = exoUnsettableRef;
        } else if (port.kind === EXO_PORT_CHILDREN) {
            // A children port's setter decides only what `set` and `bind` mean;
            // `one`/`list`/`bindList` never read this table.
            setters[i] = ownsElement[i] === 1 ? setExoHtml : exoUnsettableSharedContent;
        } else {
            const name = named(port.name, 'an attribute');
            // WHICH attribute this port is, decided by the file that BUILT the element and handed
            // to the pack rather than looked up on it: a writers pack is free to write something
            // else entirely, but if it writes an attribute it must write the one the statics beside
            // it went through `putExoAttr` to get, and that is only true of one table asked once.
            const built = writers.attr(
                name,
                on,
                port.kind,
                on.namespaceURI === EXO_HTML_NS
                    ? name.toLowerCase()
                    : (backend.foreignNamespaces as TExoForeignNamespaces).attrIdentity(
                          name.toLowerCase(),
                          on.namespaceURI as string
                      )
            );
            setters[i] = built.write;
            writeData[i] = built.data;
            if (!writers.markupCarries(name, on)) {
                if (markupMisses === null) markupMisses = createExoIntTable(portList.length, 0);
                markupMisses[i] = 1;
            }
        }
    }

    // The prototype stays in its `<template>`: page-owning the clones (`document.importNode`)
    // was removed for a measured −9.2% on the mount axis (README, "A connected element at
    // `mount` is not promised"), and inertness stays structural (`proto-ownership.test.ts`).
    const instanceProto = proto;

    // Kept because `findExoRowDisagreement` compares a live row against them inside adoption's loops.
    const protoLandings: Node[] = probe;

    // Built whole, in one field order, so every schema in the process shares one hidden class: this
    // object is read on the hot path of every render.
    const compiled: TExoDomSchema = {
        // An ACCESSOR, and the only one on this object: nothing on a render path reads it, and
        // serialising the prototype for the two readers that do (a benchmark report, a test) would
        // put the string build this compiler exists to remove back on every schema.
        get html(): string {
            return instanceProto.outerHTML;
        },
        proto: instanceProto,
        protoLandings,
        walk,
        hydrateWalk: emitter.anyFromEnd ? hydrateWalk : walk,
        slots,
        setters,
        writeData,
        events,
        elem,
        markupMisses,
        childListStartSlot: emitter.childListStartSlot,
        childListEndSlot: emitter.childListEndSlot,
        adoptStopSlot,
        childListNextPort,
        hasAdjacentChildLists: emitter.hasAdjacentChildLists,
        childListPrevPort,
        childListPrevStatics,
        hasSeparatedChildLists,
        ownsElement,
        hydrateUnreachable: unreachable.length === 0 ? NO_UNREACHABLE : unreachable,
        rootTag: emitter.rootTag as string,
        ports: declaration.portList,
        backend,
        acquireNode: cloneExoNode,
        childUnmount: disposeExoChildSelf,
        hydrateSchema: null,
        sharesEmptyNodes: walk.length === 0 && setters.length === 0,
        // Two factories: a fixed-list row must not carry the reconciler's twelve slots, so a module
        // replacing one must replace both or it has made a third shape.
        createInstance: backend.createInstance,
        createChild: backend.createChild,
        domPortWrite: null,
        domPortNodes: null,
    };
    return compiled;
}

/**
 * A STATIC attribute, put where a parser reading the server's bytes would have put it. An HTML
 * element is left to `setAttribute`, which lowercases the name itself; foreign content goes through
 * the same identity a port's writer is built with, because `setAttribute('xlink:href', …)` makes a
 * NULL-namespace attribute whose local name is the whole string, standing beside the real one
 * nothing then writes.
 */
function putExoAttr(
    el: Element,
    name: string,
    value: string,
    ns: string,
    foreign: TExoForeignNamespaces | undefined
): void {
    if (ns === EXO_HTML_NS) {
        el.setAttribute(name, value);
        return;
    }
    const at = (foreign as TExoForeignNamespaces).attrIdentity(name.toLowerCase(), ns);
    if (typeof at === 'string') el.setAttribute(at, value);
    else el.setAttributeNS(at.ns, at.qualified, value);
}

/** A port's name, refused rather than coerced: the throw is what narrows it to `string`. */
function named(name: string | null, what: string): string {
    if (name === null) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `createExoSchema(dom): a port for ${what} was declared without a name`
                : 'EXO0046'
        );
    }
    return name;
}
