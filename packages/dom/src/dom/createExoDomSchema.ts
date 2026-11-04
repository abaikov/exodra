import { createExoIntTable } from './factories/createExoIntTable';
import {
    EXO_PORT_CHILDREN,
    EXO_PORT_EVENT,
    EXO_PORT_REF,
    EXO_PORT_TEXT,
    createExoPortOfKind,
} from '@exodra/core';
import type { TExoAnyPort } from '@exodra/core';
import { EXO_WALK_FIRST_CHILD } from './constants/EXO_WALK_FIRST_CHILD';
import { EXO_WALK_FROM_END } from './constants/EXO_WALK_FROM_END';
import { EXO_WALK_NEXT_SIBLING } from './constants/EXO_WALK_NEXT_SIBLING';
import { exoUnsettableEvent } from './constants/exoUnsettableEvent';
import { exoUnsettableRef } from './constants/exoUnsettableRef';
import { exoUnsettableSharedContent } from './constants/exoUnsettableSharedContent';
import { cloneExoNode } from '../backend/cloneExoNode';
import { disposeExoChildSelf } from './factories/createExoDomChildFactory';
import { EXO_HTML_NS } from '@exodra/core';
import type { TExoAttrIdentity } from './types/TExoAttrIdentity';
import { setExoHtml } from './setExoHtml';
import type { TExoDomApi } from './types/TExoDomApi';
import type { TExoDomSchema } from './types/TExoDomSchema';
import type { TExoDomJsonDeclaration } from './types/TExoDomJsonDeclaration';
import type { TExoDomSetter } from './types/TExoDomSetter';

const TEXT_NODE = 3;

const NO_UNREACHABLE: readonly number[] = [];

function named(name: string | null, what: string): string {
    if (name === null) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `createExoDomSchema: a port for ${what} was written without a name`
                : `EXO0097 ${what}`
        );
    }
    return name;
}

/**
 * A SCHEMA FROM DATA — the page-side half of shipping schemas instead of declarations.
 *
 * There is no markup function here and no walk to discover: the JSON declaration carries the walk the compiler
 * worked out, and this function replays it over ONE parsed prototype to recover the landings. Two
 * things are deliberately NOT carried and are asked again, because both are the WRITERS PACK's
 * answer and a different composition must get its own: the setter behind each port, and whether
 * the prototype already puts that port's value into effect.
 *
 * WHY THE WALK IS REPLAYED RATHER THAN THE LANDINGS CARRIED: a landing is a live node of THIS
 * parse, so there is nothing to carry — a build could only have written down how to find it, which
 * is what the walk already is.
 */
function exoForeignAttrIdentity(backend: TExoDomApi, markup: string, ns: string): TExoAttrIdentity {
    const foreign = backend.foreignNamespaces;
    if (foreign === undefined) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `createExoDomSchema: an attribute on a ${ns} element, and this backend was ` +
                  'composed without withExoForeignNamespaces.'
                : `EXO0110 "${ns}"`
        );
    }
    return foreign.attrIdentity(markup, ns);
}

export function createExoDomSchema(
    declaration: TExoDomJsonDeclaration,
    backend: TExoDomApi
): TExoDomSchema {
    // A `<template>`, as the compiler uses: every node is created in the inert template-contents
    // document, so no image loads and no script runs when a page imports its schemas.
    const holder = document.createElement('template');
    holder.innerHTML = declaration.html;
    const proto = holder.content.firstElementChild;
    if (proto === null) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? "createExoDomSchema: the JSON declaration's `html` parsed to no element. A schema " +
                  'declaration holds ONE root element, which is what the compile that produced it ' +
                  'refused anything else for.'
                : 'EXO0098'
        );
    }

    const walk = declaration.walk;
    const probe: Node[] = new Array(declaration.slots);
    probe[0] = proto;
    // THE PLACEHOLDERS GO BACK IN AS THE WALK REACHES THEM, and this is the one thing `html` could
    // not carry: the compiler puts an empty Text node under every element a text port writes into,
    // and an empty Text node serialises to nothing — so the parse above has no child there and the
    // hop would land on `null`. Hydration makes exactly this insertion for exactly this reason.
    const textSlots = declaration.textSlots;
    for (let i = 0; i < walk.length; i += 3) {
        const from = probe[walk[i + 1]];
        const op = walk[i + 2];
        if (op === EXO_WALK_FIRST_CHILD) {
            const at = from.firstChild;
            if ((at === null || at.nodeType !== TEXT_NODE) && textSlots.includes(walk[i])) {
                const made = (from.ownerDocument ?? document).createTextNode('');
                from.insertBefore(made, at);
                probe[walk[i]] = made;
                continue;
            }
            probe[walk[i]] = at as Node;
        } else if (op === EXO_WALK_NEXT_SIBLING) {
            probe[walk[i]] = from.nextSibling as Node;
        } else {
            let landed = from.lastChild as Node;
            for (let back = op - EXO_WALK_FROM_END; back > 0; back--) {
                landed = landed.previousSibling as Node;
            }
            probe[walk[i]] = landed;
        }
    }

    let elem = declaration.elem;
    let walkTable = walk;
    let hydrateWalk = declaration.hydrateWalk;
    let unreachable = declaration.hydrateUnreachable;
    let slots = declaration.slots;
    // Copied before the first text port that moves its slot: the declaration is shared by every
    // backend that builds from it.
    let owned: {
        walk: number[];
        hydrateWalk: number[] | null;
        elem: number[];
        unreachable: number[];
    } | null = null;
    const own = () => {
        if (owned !== null) return owned;
        owned = {
            walk: walkTable.slice(),
            hydrateWalk: hydrateWalk === null ? null : hydrateWalk.slice(),
            elem: elem.slice(),
            unreachable: unreachable.slice(),
        };
        walkTable = owned.walk;
        hydrateWalk = owned.hydrateWalk;
        elem = owned.elem;
        unreachable = owned.unreachable;
        return owned;
    };
    const ownsElement = declaration.ownsElement;
    const ports: TExoAnyPort[] = [];
    const setters: TExoDomSetter[] = new Array(declaration.ports.length);
    const writeData: unknown[] = new Array(declaration.ports.length).fill(null);
    let markupMisses: number[] | null = null;
    const writers = backend.writers;
    const events = backend.events;

    for (let i = 0; i < declaration.ports.length; i++) {
        const written = declaration.ports[i];
        const port = createExoPortOfKind(written.kind, i, written.name);
        ports.push(port);
        const landing = probe[elem[i]];
        if (written.kind === EXO_PORT_TEXT) {
            // THE SLOT MAY ALREADY BE THE TEXT NODE. The compiler moved a text port's slot onto
            // `firstChild` when its writer stored into one, and the walk triple that landed it
            // there names the element it came from — so the element is recovered rather than
            // carried, and `writers.text` is handed what the compile handed it.
            const on =
                landing.nodeType === TEXT_NODE
                    ? (landing.parentNode as Element)
                    : (landing as Element);
            const setter = writers.text(on);
            setters[i] = setter;
            // The slot follows THIS composition's writer, whichever one the build compiled under.
            if (setter.takesTextNode === true && landing.nodeType !== TEXT_NODE) {
                const tables = own();
                let placeholder = on.firstChild;
                if (placeholder === null || placeholder.nodeType !== TEXT_NODE) {
                    placeholder = (on.ownerDocument ?? document).createTextNode('');
                    on.insertBefore(placeholder, on.firstChild);
                }
                const textSlot = slots++;
                tables.walk.push(textSlot, tables.elem[i], EXO_WALK_FIRST_CHILD);
                tables.hydrateWalk?.push(textSlot, tables.elem[i], EXO_WALK_FIRST_CHILD);
                probe[textSlot] = placeholder;
                for (let b = 0; b < tables.unreachable.length; b += 2) {
                    if (
                        tables.elem[i] >= tables.unreachable[b] &&
                        tables.elem[i] < tables.unreachable[b + 1]
                    ) {
                        tables.unreachable.push(textSlot, textSlot + 1);
                        break;
                    }
                }
                tables.elem[i] = textSlot;
            } else if (setter.takesTextNode !== true && landing.nodeType === TEXT_NODE) {
                const tables = own();
                for (let k = 0; k < tables.walk.length; k += 3) {
                    if (tables.walk[k] === tables.elem[i]) {
                        tables.elem[i] = tables.walk[k + 1];
                        break;
                    }
                }
            }
            if (!writers.markupCarries(null, on)) {
                if (markupMisses === null)
                    markupMisses = createExoIntTable(declaration.ports.length, 0);
                markupMisses[i] = 1;
            }
        } else if (written.kind === EXO_PORT_EVENT) {
            setters[i] = exoUnsettableEvent;
            writeData[i] = events.port(named(written.name, 'an event'));
        } else if (written.kind === EXO_PORT_REF) {
            setters[i] = exoUnsettableRef;
        } else if (written.kind === EXO_PORT_CHILDREN) {
            setters[i] = ownsElement[i] === 1 ? setExoHtml : exoUnsettableSharedContent;
        } else {
            const name = named(written.name, 'an attribute');
            const on = landing as Element;
            const built = writers.attr(
                name,
                on,
                written.kind,
                on.namespaceURI === EXO_HTML_NS
                    ? name.toLowerCase()
                    : exoForeignAttrIdentity(backend, name.toLowerCase(), on.namespaceURI as string)
            );
            setters[i] = built.write;
            writeData[i] = built.data;
            if (!writers.markupCarries(name, on)) {
                if (markupMisses === null)
                    markupMisses = createExoIntTable(declaration.ports.length, 0);
                markupMisses[i] = 1;
            }
        }
    }

    // The same literal, in the same field order, as `compileExoDomSchema`'s: two shapes here would
    // put a second hidden class at the field every render reads.
    const compiled: TExoDomSchema = {
        get html(): string {
            return proto.outerHTML;
        },
        proto,
        protoLandings: probe,
        walk: walkTable,
        hydrateWalk: hydrateWalk === null ? walkTable : hydrateWalk,
        slots,
        setters,
        writeData,
        events,
        elem,
        markupMisses,
        childListStartSlot: declaration.childListStartSlot,
        childListEndSlot: declaration.childListEndSlot,
        adoptStopSlot: declaration.adoptStopSlot,
        childListNextPort: declaration.childListNextPort,
        hasAdjacentChildLists: declaration.hasAdjacentChildLists,
        childListPrevPort: declaration.childListPrevPort,
        childListPrevStatics: declaration.childListPrevStatics,
        hasSeparatedChildLists: declaration.hasSeparatedChildLists,
        ownsElement,
        hydrateUnreachable: unreachable.length === 0 ? NO_UNREACHABLE : unreachable,
        rootTag: declaration.rootTag,
        ports,
        portNames: new Array<string | null>(ports.length).fill(null),
        backend,
        acquireNode: cloneExoNode,
        childUnmount: disposeExoChildSelf,
        hydrateSchema: null,
        sharesEmptyNodes: walkTable.length === 0 && setters.length === 0,
        createInstance: backend.createInstance,
        createChild: backend.createChild,
        domPortWrite: null,
        domPortNodes: null,
    };
    return compiled;
}
