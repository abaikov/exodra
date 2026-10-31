import { assertExoLegalAttrName } from '../../attr/asserts/assertExoLegalAttrName';
import { assertExoUniqueAttr } from '../../attr/asserts/assertExoUniqueAttr';
import { assertExoFreePortName } from '../ports/asserts/assertExoFreePortName';
import { assertExoIntactRawTextBoundary } from '../markup/asserts/assertExoIntactRawTextBoundary';
import { assertExoLegalTagName } from '../markup/asserts/assertExoLegalTagName';
import { assertExoLiveCursor } from './asserts/assertExoLiveCursor';
import { assertExoNoElementInRawText } from '../markup/asserts/assertExoNoElementInRawText';
import { assertExoNoTextPortInRawText } from '../markup/asserts/assertExoNoTextPortInRawText';
import { assertExoOutermostAsserts } from './asserts/assertExoOutermostAsserts';
import { assertExoServablePropertyPort } from '../ports/asserts/assertExoServablePropertyPort';
import { assertExoSoleChildRawTextPort } from '../markup/asserts/assertExoSoleChildRawTextPort';
import { assertExoStandingCursor } from './asserts/assertExoStandingCursor';
import type { TExoAttrPort } from '../ports/types/TExoAttrPort';
import type { TExoChildrenPort } from '../ports/types/TExoChildrenPort';
import type { TExoEventPort } from '../ports/types/TExoEventPort';
import type { TExoPortName } from '../ports/types/TExoPortName';
import type { TExoRefPort } from '../ports/types/TExoRefPort';
import type { TExoSchemaCursor } from './types/TExoSchemaCursor';
import type { TExoSchemaDraft } from './types/TExoSchemaDraft';
import type { TExoTextPort } from '../ports/types/TExoTextPort';

type TExoOpenElement = {
    readonly tag: string;
    readonly statics: string[];
    readonly ported: string[];
    siblings: number;
    adjacentText: string;
};

function openElement(
    tag: string,
    attrs?: Readonly<Record<string, unknown>> | null
): TExoOpenElement {
    const statics: string[] = [];
    if (attrs !== undefined && attrs !== null) {
        for (const name in attrs) statics.push(name, String(attrs[name]));
    }
    return { tag, statics, ported: [], siblings: 0, adjacentText: '' };
}

export class ExoAssertingSchemaCursor<TPorts = unknown> implements TExoSchemaCursor<TPorts> {
    private readonly inner: TExoSchemaCursor<TPorts>;
    private element: TExoOpenElement;
    private alive: boolean;

    constructor(
        inner: TExoSchemaCursor<TPorts>,
        tag: string,
        attrs?: Readonly<Record<string, unknown>> | null
    ) {
        this.inner = inner;
        this.element = openElement(tag, attrs);
        this.alive = true;
        inner.receiver = this;
    }

    get draft(): TExoSchemaDraft {
        return this.inner.draft;
    }

    get receiver(): TExoSchemaCursor<TPorts> {
        return this.inner.receiver;
    }

    set receiver(next: TExoSchemaCursor<TPorts>) {
        this.inner.receiver = next;
    }

    private standing(declaredBy: string): void {
        assertExoLiveCursor(this.inner.draft, declaredBy);
        assertExoStandingCursor(this.alive, this.element.tag, declaredBy);
    }

    private endedRun(): void {
        this.element.siblings++;
        this.element.adjacentText = '';
    }

    el(
        tag: string,
        attrs?: Readonly<Record<string, unknown>> | null,
        fn?: (cursor: TExoSchemaCursor<TPorts>) => void
    ): this {
        this.standing('ExoSchemaCursor.el()');
        const inner = this.inner;
        assertExoLegalTagName(tag, 'ExoSchemaCursor.el()');
        assertExoNoElementInRawText(this.element.tag, tag, 'ExoSchemaCursor.el()');
        if (attrs !== undefined && attrs !== null) {
            for (const name in attrs) {
                assertExoLegalAttrName(name, 'ExoSchemaCursor.el()');
            }
        }
        this.endedRun();
        if (fn === undefined) {
            inner.el(tag, attrs);
            return this;
        }
        assertExoOutermostAsserts(inner.receiver === this, 'ExoSchemaCursor.el()');
        const nested = new ExoAssertingSchemaCursor<TPorts>(inner, tag, attrs);
        try {
            inner.el(tag, attrs, fn);
        } finally {
            nested.alive = false;
            inner.receiver = this;
        }
        return this;
    }

    fork(): TExoSchemaCursor<TPorts> {
        this.standing('ExoSchemaCursor.fork()');
        const forked = new ExoAssertingSchemaCursor<TPorts>(this.inner.fork(), this.element.tag);
        forked.element = this.element;
        return forked;
    }

    text(value: unknown): this {
        this.standing('ExoSchemaCursor.text()');
        const element = this.element;
        const text = String(value);
        assertExoIntactRawTextBoundary(
            element.tag,
            element.adjacentText,
            text,
            'ExoSchemaCursor.text()'
        );
        element.siblings++;
        element.adjacentText += text;
        this.inner.text(value);
        return this;
    }

    private checkedAttrPort(
        first: TExoAttrPort | string,
        second: string | undefined,
        declaredBy: string,
        place: (
            first: TExoAttrPort | string,
            second?: TExoPortName<TPorts, TExoAttrPort>
        ) => TExoAttrPort
    ): TExoAttrPort {
        this.standing(declaredBy);
        const element = this.element;
        const name = typeof first === 'string' ? first : (second as string);
        assertExoLegalAttrName(name, declaredBy);
        assertExoUniqueAttr(element.tag, element.statics, element.ported, name, declaredBy);
        assertExoServablePropertyPort(element.tag, name, declaredBy);
        element.ported.push(name);
        if (typeof first !== 'string')
            return place(first, name as TExoPortName<TPorts, TExoAttrPort>);
        if (second !== undefined) {
            assertExoFreePortName(this.inner.draft.named, second, declaredBy);
        }
        return place(first, second as TExoPortName<TPorts, TExoAttrPort>);
    }

    attrPort(port: TExoAttrPort, name: string): TExoAttrPort;
    attrPort(name: string, portName?: TExoPortName<TPorts, TExoAttrPort>): TExoAttrPort;
    attrPort(first: TExoAttrPort | string, second?: string): TExoAttrPort {
        return this.checkedAttrPort(
            first,
            second,
            typeof first === 'string' ? 'ExoSchemaCursor.port()' : 'ExoSchemaCursor.attrPort()',
            (given, name) =>
                this.inner.attrPort(given as string, name as TExoPortName<TPorts, TExoAttrPort>)
        );
    }

    stringPort(port: TExoAttrPort, name: string): TExoAttrPort;
    stringPort(name: string, portName?: TExoPortName<TPorts, TExoAttrPort>): TExoAttrPort;
    stringPort(first: TExoAttrPort | string, second?: string): TExoAttrPort {
        return this.checkedAttrPort(first, second, 'ExoSchemaCursor.stringPort()', (given, name) =>
            this.inner.stringPort(given as string, name as TExoPortName<TPorts, TExoAttrPort>)
        );
    }

    togglePort(port: TExoAttrPort, name: string): TExoAttrPort;
    togglePort(name: string, portName?: TExoPortName<TPorts, TExoAttrPort>): TExoAttrPort;
    togglePort(first: TExoAttrPort | string, second?: string): TExoAttrPort {
        return this.checkedAttrPort(first, second, 'ExoSchemaCursor.togglePort()', (given, name) =>
            this.inner.togglePort(given as string, name as TExoPortName<TPorts, TExoAttrPort>)
        );
    }

    port(name: string, portName?: TExoPortName<TPorts, TExoAttrPort>): TExoAttrPort {
        return this.attrPort(name, portName);
    }

    eventPort(port: TExoEventPort, name: string): TExoEventPort;
    eventPort(name: string, portName?: TExoPortName<TPorts, TExoEventPort>): TExoEventPort;
    eventPort(first: TExoEventPort | string, second?: string): TExoEventPort {
        this.standing('ExoSchemaCursor.eventPort()');
        if (typeof first !== 'string') return this.inner.eventPort(first, second as string);
        if (second !== undefined) {
            assertExoFreePortName(this.inner.draft.named, second, 'ExoSchemaCursor.eventPort()');
        }
        return this.inner.eventPort(first, second as TExoPortName<TPorts, TExoEventPort>);
    }

    textPort(port: TExoTextPort): TExoTextPort;
    textPort(portName?: TExoPortName<TPorts, TExoTextPort>): TExoTextPort;
    textPort(given?: TExoTextPort | string): TExoTextPort {
        this.standing('ExoSchemaCursor.textPort()');
        assertExoNoTextPortInRawText(this.element.tag, 'ExoSchemaCursor.textPort()');
        if (given !== undefined && typeof given !== 'string') return this.inner.textPort(given);
        if (given !== undefined) {
            assertExoFreePortName(this.inner.draft.named, given, 'ExoSchemaCursor.textPort()');
        }
        return this.inner.textPort(given as TExoPortName<TPorts, TExoTextPort>);
    }

    childrenPort(port: TExoChildrenPort): TExoChildrenPort;
    childrenPort(portName?: TExoPortName<TPorts, TExoChildrenPort>): TExoChildrenPort;
    childrenPort(given?: TExoChildrenPort | string): TExoChildrenPort {
        this.standing('ExoSchemaCursor.childrenPort()');
        const element = this.element;
        assertExoSoleChildRawTextPort(
            element.tag,
            element.siblings,
            'ExoSchemaCursor.childrenPort()'
        );
        this.endedRun();
        if (given !== undefined && typeof given !== 'string') return this.inner.childrenPort(given);
        if (given !== undefined) {
            assertExoFreePortName(this.inner.draft.named, given, 'ExoSchemaCursor.childrenPort()');
        }
        return this.inner.childrenPort(given as TExoPortName<TPorts, TExoChildrenPort>);
    }

    refPort(port: TExoRefPort): TExoRefPort;
    refPort(portName?: TExoPortName<TPorts, TExoRefPort>): TExoRefPort;
    refPort(given?: TExoRefPort | string): TExoRefPort {
        this.standing('ExoSchemaCursor.refPort()');
        if (given !== undefined && typeof given !== 'string') return this.inner.refPort(given);
        if (given !== undefined) {
            assertExoFreePortName(this.inner.draft.named, given, 'ExoSchemaCursor.refPort()');
        }
        return this.inner.refPort(given as TExoPortName<TPorts, TExoRefPort>);
    }
}
