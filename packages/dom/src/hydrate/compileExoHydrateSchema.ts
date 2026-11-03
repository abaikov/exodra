import { createExoIntTable } from '../dom/factories/createExoIntTable';
import { EXO_PORT_CHILDREN, EXO_PORT_EVENT, EXO_PORT_REF } from '@exodra/core';
import type { TExoCursorDeclaration } from '@exodra/core';
import {
    createExoRepairingFill,
    createExoRepairingHtmlFill,
} from './factories/createExoRepairingFill';
import { assertReachableExoPorts } from './asserts/assertReachableExoPorts';
import { assertExoContentAdopt } from './asserts/assertExoContentAdopt';
import { requireExoHydrateSurface } from './requireExoHydrateSurface';
import { setExoHtml } from '../dom/setExoHtml';
import type { TExoDomSchema } from '../dom/types/TExoDomSchema';
import type { TExoDomApi } from '../dom/types/TExoDomApi';
import type { TExoDomSetter } from '../dom/types/TExoDomSetter';
import type { TExoHydrateSchema } from './types/TExoHydrateSchema';

// No second compile, and there must not be one: the walk, the slot count and the port→element table
// are shared BY REFERENCE, and the day two answers disagree the page adopts the wrong elements with
// no error. It decides one thing — which ports still need a write.
export function compileExoHydrateSchema(
    schema: TExoCursorDeclaration,
    backend: TExoDomApi,
    // 1:1 with this schema, so it is also this schema's CACHE KEY.
    dom: TExoDomSchema
): TExoHydrateSchema {
    const surface = requireExoHydrateSurface(backend);
    const portList = schema.portList;
    const count = portList.length;

    assertReachableExoPorts(schema, dom.hydrateUnreachable, dom.elem);

    const setters: TExoDomSetter[] = new Array(count);
    const elem = createExoIntTable(count, 0);
    // By port index: 1 where the markup does not put the value into effect.
    const markupMisses = dom.markupMisses;
    for (let i = 0; i < count; i++) {
        const kind = portList[i].kind;
        if (markupMisses !== null && markupMisses[i] === 1 && kind !== EXO_PORT_CHILDREN) {
            // The silencing premise — the server printed the value — is FALSE for `indeterminate`,
            // a `<textarea>`'s `value` and any port a pack writes as a property. Not "every property
            // port": a parsed ` checked=""` ticks the box, so `checked` stays silenced.
            setters[i] = dom.setters[i];
            elem[i] = dom.elem[i];
        } else if (kind === EXO_PORT_EVENT) {
            // The ELEMENT is what this branch exists for: `on` resolves the node through `elem`,
            // and the `else` below would leave slot 0 — the instance root — for every event port
            // on the page. The setter slot keeps the DOM schema's REFUSAL for the ref port's reason.
            setters[i] = dom.setters[i];
            elem[i] = dom.elem[i];
        } else if (kind === EXO_PORT_CHILDREN) {
            // Asked of the DOM SCHEMA and not re-derived: "the port owns its element" is said by
            // which setter the emit walk installed. Every other children port REFUSES, because a
            // silent no-op turns a mistake that fails loudly on a client render into a page that
            // hydrates into nonsense.
            if (dom.setters[i] === setExoHtml) {
                setters[i] = createExoRepairingHtmlFill();
                elem[i] = dom.elem[i];
            } else {
                setters[i] = assertExoContentAdopt;
            }
        } else if (kind === EXO_PORT_REF) {
            // Keeps the DOM schema's entry, which is a REFUSAL: a no-op would make
            // `c.attr(refPort, v)` silent where a client render throws by name.
            setters[i] = dom.setters[i];
        } else {
            // THE ELEMENT IS CARRIED, unlike the no-op this replaced: a compare has to read the node
            // the server printed, and slot 0 is the instance root.
            setters[i] = createExoRepairingFill(portList[i].name, kind, dom.setters[i]);
            elem[i] = dom.elem[i];
        }
    }

    // Text landings the server may not have sent, read back out of the DOM schema's own walk —
    // which holds exactly one triple landing on that slot — rather than decided again.
    let textLandings: number[] | null = null;
    for (let i = 0; i < count; i++) {
        if (dom.setters[i].takesTextNode !== true) continue;
        const slot = dom.elem[i];
        for (let w = 0; w < dom.walk.length; w += 3) {
            if (dom.walk[w] !== slot) continue;
            (textLandings ??= []).push(slot, dom.walk[w + 1]);
            break;
        }
    }

    return {
        // `hydrateWalk` and not `walk`: taking `walk` wires the footer's port onto row 0, with no
        // error and nothing in the markup to see.
        walk: dom.hydrateWalk,
        slots: dom.slots,
        sharesEmptyNodes: dom.slots === 1 && setters.length === 0,
        proto: dom.proto,
        setters,
        writeData: dom.writeData,
        // From the DOM schema for the same reason `backend` is: one pack attaches the listeners for
        // both passes, so a render and an adoption of one declaration cannot choose differently.
        events: dom.events,
        elem,
        live: dom.setters,
        liveElem: dom.elem,
        textLandings,
        childListStartSlot: dom.childListStartSlot,
        adoptStopSlot: dom.adoptStopSlot,
        childListPrevPort: dom.childListPrevPort,
        childListPrevStatics: dom.childListPrevStatics,
        ownsElement: dom.ownsElement,
        portNames: dom.portNames,
        hasSeparatedChildLists: dom.hasSeparatedChildLists,
        // From the DOM schema and not from the parameter, so a schema and the key it is filed under
        // cannot disagree about which pair it belongs to.
        backend: dom.backend,
        domSchema: dom,
        domPortWrite: null,
        domPortNodes: null,
        // Off the ADOPTING SURFACE and not the backend: a constructor's prototype is fixed when the
        // constructor is made, so a record standing on the backend would find the RENDER's `set`
        // while a hydration was running.
        createInstance: surface.createInstance,
        createChild: surface.createChild,
    };
}
