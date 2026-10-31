import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { askTheChecker, extractEntities, EXO_UNRESOLVED_TYPE } from '../extractEntities';
import { EXO_BOX_MEMBERS } from '../boxLimits';
import type { TExoUnresolvedType } from '../types';

/** Write one source file and read back the diagram it produces. */
function extract(source: string) {
    const dir = mkdtempSync(join(tmpdir(), 'exo-entities-'));
    writeFileSync(join(dir, 'source.ts'), source);
    return extractEntities({ include: [join(dir, '*.ts')] });
}

describe('extractEntities', () => {
    it('keeps every member, however many a box could draw', () => {
        const methods = Array.from(
            { length: EXO_BOX_MEMBERS + 5 },
            (_unused, index) => `    method${index}(): void {}`
        ).join('\n');
        const model = extract(`export class Wide {\n${methods}\n}`);

        const node = model.nodes.find((candidate) => candidate.id === 'Wide');
        // The box shows the first few and counts the rest — but the model has
        // to carry all of them, or "… N more" leads nowhere.
        expect(node?.members).toHaveLength(EXO_BOX_MEMBERS + 5);
        expect(node?.memberCount).toBe(EXO_BOX_MEMBERS + 5);
    });

    it('says which members are static and which are abstract', () => {
        const model = extract(`
            export abstract class Shape {
                static origin = 0;
                abstract area(): number;
                draw(): void {}
            }
        `);

        const members = model.nodes.find((node) => node.id === 'Shape')?.members ?? [];
        const modifierOf = (name: string) =>
            members.find((member) => member.text.startsWith(name))?.modifier;
        expect(modifierOf('origin')).toBe('static');
        expect(modifierOf('area')).toBe('abstract');
        expect(modifierOf('draw')).toBeUndefined();
    });

    it('carries the author’s description, from JSDoc or from a `//` block', () => {
        const model = extract(`
            /** Renders a schema into the DOM. */
            export class Renderer {
                /** Throws away the subtree. */
                dispose(): void {}
            }

            // Builds the node for a schema.
            // Reuses the parent's scope.
            export function build(): void {}
        `);

        const renderer = model.nodes.find((node) => node.id === 'Renderer');
        expect(renderer?.doc).toBe('Renders a schema into the DOM.');
        expect(renderer?.members?.[0]?.doc).toBe('Throws away the subtree.');

        // A `//` block above a declaration IS its documentation to a reader.
        expect(model.nodes.find((node) => node.id === 'build')?.doc).toBe(
            'Builds the node for a schema.'
        );
    });

    it('does not adopt a comment that a blank line separates from the code', () => {
        const model = extract(`
            // A note about the file, not about what follows.

            export function unrelated(): void {}
        `);

        expect(model.nodes.find((node) => node.id === 'unrelated')?.doc).toBeUndefined();
    });

    it('keeps the uncut signature next to the shortened one', () => {
        const model = extract(`
            export type TExoLongUnion = 'aaaa' | 'bbbb' | 'cccc' | 'dddd' | 'eeee' | 'ffff';
            export function make(): TExoLongUnion {
                return 'aaaa';
            }
        `);

        const member = model.nodes.find((node) => node.id === 'make')?.members?.[0];
        expect(member?.full).toContain('TExoLongUnion');
        // Shortening is what the box needs; the panel and the tooltip must not
        // inherit it, or a cut type is unreadable everywhere.
        expect(member?.full).not.toContain('…');
    });

    it('prints the type the author wrote, not the checker’s expansion of it', () => {
        // The point is not cosmetic. Asking the checker for a type it has to WORK OUT runs
        // assignability, and a self-referential interface — one whose method parameters
        // mention the interface again, which `TExoChildrenWiring` is — makes that
        // recursion unbounded. Every annotation below is therefore read as source.
        const model = extract(`
            export type TExoAlias = { readonly n: number };
            export class Box {
                private readonly items: readonly TExoAlias[] = [];
                take(n: number): TExoAlias | null {
                    return this.items[n] ?? null;
                }
            }
            export function pick(box: Box): TExoAlias | null {
                return box.take(0);
            }
        `);

        const box = model.nodes.find((node) => node.id === 'Box')?.members ?? [];
        // An alias survives as an alias, and `readonly` is not normalised away — both are
        // things the checker's own rendering is free to change.
        expect(box[0]?.full).toBe('items: readonly TExoAlias[]');
        expect(box[1]?.full).toBe('take(n): TExoAlias | null');
        expect(model.nodes.find((node) => node.id === 'pick')?.members?.[0]?.full).toBe(
            '(box): TExoAlias | null'
        );
        // Nothing was lost, so the key is absent rather than an empty array nobody reads.
        expect(model.unresolved).toBeUndefined();
    });

    it('still infers a type where the author wrote none', () => {
        const model = extract(`
            export class Counter {
                total = 0;
            }
            export function zero() {
                return 0;
            }
        `);

        expect(model.nodes.find((node) => node.id === 'Counter')?.members?.[0]?.full).toBe(
            'total: number'
        );
        expect(model.nodes.find((node) => node.id === 'zero')?.members?.[0]?.full).toBe(
            '(): number'
        );
        expect(model.unresolved).toBeUndefined();
    });

    it('records a type the checker could not produce instead of dying on it', () => {
        // The real trigger is a stack overflow inside TypeScript's assignability machinery,
        // which cannot be provoked cheaply or deterministically from a test. What IS worth
        // pinning is the contract every such failure has to keep: the run survives, the
        // member keeps its name, and the loss is written down where the CLI can count it.
        const into: TExoUnresolvedType[] = [];
        const text = askTheChecker(
            () => {
                throw new RangeError('Maximum call stack size exceeded');
            },
            'TExoTermNode',
            'bindOne',
            into
        );

        expect(text).toBe(EXO_UNRESOLVED_TYPE);
        expect(into).toEqual([
            {
                owner: 'TExoTermNode',
                member: 'bindOne',
                reason: 'Maximum call stack size exceeded',
            },
        ]);
    });

    it('does not put a member’s own comment inside its box line', () => {
        const model = extract(`
            export interface TExoOptions {
                /** How deep to walk. */
                depth: number;
            }
        `);

        const member = model.nodes.find((node) => node.id === 'TExoOptions')?.members?.[0];
        expect(member?.text).not.toContain('/**');
        expect(member?.doc).toBe('How deep to walk.');
    });
});
