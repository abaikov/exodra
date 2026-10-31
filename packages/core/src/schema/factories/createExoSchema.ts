import { ExoSchemaCursor } from '../cursor/ExoSchemaCursor';
import { assertExoOneRoot } from '../markup/asserts/assertExoOneRoot';
import { assertExoRootElement } from '../markup/asserts/assertExoRootElement';
import type { TExoAnyPort } from '../ports/types/TExoAnyPort';
import type { TExoCursorDeclaration } from '../types/TExoCursorDeclaration';
import type { TExoEmitter } from '../types/TExoEmitter';
import type { TExoSchemaBuild } from '../types/TExoSchemaBuild';
import type { TExoSchemaCursor } from '../cursor/types/TExoSchemaCursor';
import type { TExoSchemaDecorator } from '../cursor/types/TExoSchemaDecorator';
import { createExoPortRecord } from '../ports/factories/createExoPortRecord';
import type { TExoSchemaDraft } from '../cursor/types/TExoSchemaDraft';

export function createExoSchema<TPorts>(
    build: (cursor: TExoSchemaCursor) => TPorts,
    decorate?: TExoSchemaDecorator<TPorts>
): TExoCursorDeclaration<TPorts>;
export function createExoSchema<TPorts>(
    build: (cursor: TExoSchemaCursor<TPorts>) => void,
    decorate?: TExoSchemaDecorator<TPorts>
): TExoCursorDeclaration<TPorts>;
export function createExoSchema<TPorts extends Readonly<Record<string, TExoAnyPort>>>(
    ports: TPorts,
    build: (emitter: TExoEmitter<TPorts>) => void
): TExoCursorDeclaration<TPorts>;
export function createExoSchema<TPorts>(
    first:
        | ((cursor: TExoSchemaCursor<TPorts>) => TPorts | void)
        | Readonly<Record<string, TExoAnyPort>>,
    second?: TExoSchemaDecorator<TPorts> | ((emitter: TExoEmitter<TPorts>) => void)
): TExoCursorDeclaration<TPorts> {
    const declared = typeof first === 'function' ? null : first;
    const build = (declared === null ? first : second) as (
        cursor: TExoSchemaCursor<TPorts>
    ) => TPorts | void;
    const decorate =
        declared === null ? (second as TExoSchemaDecorator<TPorts> | undefined) : undefined;
    /**
     * DOCUMENT ORDER IS GONE AND THE DECLARATION DECIDES: a port's number is its place in
     * `exoPorts`, or, for one the markup mints, the order the mint was CALLED in. THE MARKUP DOES
     * NOT RUN HERE. Whichever replay comes first — a backend's schema compile, or the harvest below
     * when somebody asks this declaration for its ports or its root tag — hands out the numbers,
     * and every replay after it finds the ports already standing at the positions its own calls
     * arrive in.
     */
    const ports: TExoAnyPort[] = [];
    if (declared !== null) {
        for (const name in declared) {
            const port = declared[name];
            ports[port.index] = port;
        }
    }
    const declaredPorts = ports.length;
    let record: TPorts | null = declared === null ? null : (declared as unknown as TPorts);
    let rootTag = '';
    let harvested = false;

    function harvest(): void {
        // One draft per HARVEST: the cursor is ONE object that moves, and `open` is what a composed
        // `withExoSchemaAsserts` reads to tell a live position from one kept past this build.
        const draft: TExoSchemaDraft = {
            named: createExoPortRecord(),
            ports,
            next: declaredPorts,
            open: true,
            describedRoots: [],
            rootTag: null,
        };
        let returned: TPorts | void;
        const cursor = new ExoSchemaCursor<TPorts>(draft, 0);
        try {
            returned = build(decorate === undefined ? cursor : decorate(cursor));
        } finally {
            draft.open = false;
        }
        const named: Record<string, TExoAnyPort> = draft.named;
        // Both spellings in one callback: refused, not merged. A merge would have to pick a winner
        // for a name declared on both, and either answer silently drops a port the author wrote.
        if (returned !== undefined) {
            let firstNamed: string | null = null;
            for (const portName in named) {
                firstNamed = portName;
                break;
            }
            if (firstNamed !== null) {
                throw new Error(
                    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                        ? `createExoSchema: this schema named the port "${firstNamed}" AND returned a record, and ` +
                          'those are two spellings of one thing' +
                          ' — the returned record is what the wiring factory reads, so every named ' +
                          'port missing from it would be unreachable, filled by nobody, with no ' +
                          'error anywhere. Name each port where it stands and return nothing, or ' +
                          'name none of them and return the record.'
                        : 'EXO0006'
                );
            }
        }
        assertExoOneRoot(draft.describedRoots);
        assertExoRootElement(draft.rootTag);
        rootTag = draft.rootTag;
        if (record === null) {
            // The names were checked against `TPorts` at every call site by `TExoPortName`; a key
            // nobody named is simply absent, which is the completeness this does not check.
            record = (returned === undefined ? named : returned) as TPorts;
        }
        harvested = true;
    }

    // Built whole so a declaration leaves with its final hidden class — the schema slots are read
    // by every render. TWO, one per kind of output; every other occupant takes a chain link.
    const schema: TExoCursorDeclaration<TPorts> = {
        get rootTag(): string {
            if (!harvested) harvest();
            return rootTag;
        },
        get ports(): TPorts {
            if (!harvested) harvest();
            return record as TPorts;
        },
        portList: ports,
        build: build as unknown as TExoSchemaBuild,
        declaredPorts,
    };
    // A decorator is there to EXAMINE the markup, so composing one asks for it to be examined:
    // that is the whole of what `withExoSchemaAsserts` does, and it has no backend to wait for.
    if (decorate !== undefined) harvest();
    return schema;
}
