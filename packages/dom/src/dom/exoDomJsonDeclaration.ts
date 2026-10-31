import type { TExoDomSchema } from './types/TExoDomSchema';
import type { TExoJsonPortDeclaration } from '@exodra/core';
import type { TExoDomJsonDeclaration } from './types/TExoDomJsonDeclaration';

const TEXT_NODE = 3;

/**
 * A COMPILED SCHEMA, TAKEN APART INTO DATA — the build-time half of shipping schemas instead of
 * declarations. Run where the compiler already ran: a build imports the declaration, compiles it
 * once, calls this, and writes the result out; the page then calls
 * `createExoDomSchema` and never links the compiler at all.
 *
 * It reads the schema's own tables and NOTHING ELSE, so what comes back cannot say more than the
 * compile did. `html` is the schema's accessor, which serialises the prototype — the one string
 * build on this path, and it happens at build time.
 */
// Read off the LANDINGS rather than off the ports: a text port whose writer stores into a Text
// node is the only thing that lands on one, and the landing says so without a second table.
function textSlotsOf(schema: TExoDomSchema): number[] {
    const slots: number[] = [];
    for (let slot = 0; slot < schema.protoLandings.length; slot++) {
        if (schema.protoLandings[slot]?.nodeType === TEXT_NODE) slots.push(slot);
    }
    return slots;
}

export function exoDomJsonDeclaration(schema: TExoDomSchema): TExoDomJsonDeclaration {
    const ports: TExoJsonPortDeclaration[] = [];
    for (const port of schema.ports) {
        ports.push({ kind: port.kind, name: port.name ?? null });
    }
    return {
        html: schema.html,
        rootTag: schema.rootTag,
        ports,
        walk: schema.walk,
        // IDENTITY, not contents: the compiler holds ONE table twice whenever no landing counts
        // back from an end, and a JSON declaration that wrote it out twice would make the page allocate two.
        hydrateWalk: schema.hydrateWalk === schema.walk ? null : schema.hydrateWalk,
        slots: schema.slots,
        elem: schema.elem,
        ownsElement: schema.ownsElement,
        childListStartSlot: schema.childListStartSlot,
        childListEndSlot: schema.childListEndSlot,
        adoptStopSlot: schema.adoptStopSlot,
        childListNextPort: schema.childListNextPort,
        childListPrevPort: schema.childListPrevPort,
        childListPrevStatics: schema.childListPrevStatics,
        hasAdjacentChildLists: schema.hasAdjacentChildLists,
        hasSeparatedChildLists: schema.hasSeparatedChildLists,
        hydrateUnreachable: schema.hydrateUnreachable,
        textSlots: textSlotsOf(schema),
    };
}
