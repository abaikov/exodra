import { describe, expect, it } from 'vitest';
import { reconcileExoOrder } from '../reconcileExoOrder';
import { createExoKeyedList } from '../createExoKeyedList';
import type { TExoPlacedChildren } from '../types/TExoPlacedChildren';

type TRow = { readonly item: string; readonly built: number };

const door = () => {
    const rows: TRow[] = [];
    let built = 0;
    const counts = { moves: 0, inserts: 0, removes: 0 };
    const kids: TExoPlacedChildren<TRow> = {
        get size() {
            return rows.length;
        },
        at: (i) => rows[i],
        insert: (child, i = rows.length) => {
            counts.inserts++;
            rows.splice(i, 0, child);
        },
        move: (from, to) => {
            counts.moves++;
            const [row] = rows.splice(from, 1);
            rows.splice(to, 0, row);
        },
        remove: (i) => {
            counts.removes++;
            rows.splice(i, 1);
        },
        removeAll: () => {
            counts.removes += rows.length;
            rows.length = 0;
        },
    };
    const build = (item: string): TRow => ({ item, built: built++ });
    return { rows, kids, counts, build };
};

const driven = <TNode>(
    kids: TExoPlacedChildren<TNode>,
    initial: readonly string[],
    build: (item: string) => TNode
) => {
    let order: string[] = [];
    const setValue = (want: readonly string[]): void => {
        order = reconcileExoOrder(kids, order, want, want, build);
    };
    setValue(initial);
    return { setValue };
};

const shown = (rows: readonly TRow[]): string[] => rows.map((row) => row.item);

const random = (seed: number) => () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
};

describe('reconcileExoOrder', () => {
    it('shrinks a list whose item appears twice', () => {
        const d = door();
        const src = driven(d.kids, ['S', 'S', 'O'], d.build);

        src.setValue(['S', 'O']);
        expect(shown(d.rows)).toEqual(['S', 'O']);

        src.setValue(['S']);
        expect(shown(d.rows)).toEqual(['S']);
    });

    it('keeps every surviving row and builds only what is new', () => {
        const d = door();
        const src = driven(d.kids, ['A', 'B', 'C', 'D'], d.build);
        const before = new Map(d.rows.map((row) => [row.item, row]));

        src.setValue(['D', 'X', 'B', 'A']);

        expect(shown(d.rows)).toEqual(['D', 'X', 'B', 'A']);
        expect(d.rows[0]).toBe(before.get('D'));
        expect(d.rows[2]).toBe(before.get('B'));
        expect(d.rows[3]).toBe(before.get('A'));
    });

    it('moves only the rows outside the longest run already in order', () => {
        const d = door();
        const src = driven(d.kids, ['A', 'B', 'C', 'D', 'E'], d.build);

        src.setValue(['B', 'C', 'D', 'E', 'A']);
        expect(shown(d.rows)).toEqual(['B', 'C', 'D', 'E', 'A']);
        expect(d.counts.moves).toBe(1);
    });

    it('moves nothing when the survivors are already in order', () => {
        const d = door();
        const src = driven(d.kids, ['A', 'B', 'C'], d.build);

        src.setValue(['X', 'A', 'C', 'Y']);
        expect(shown(d.rows)).toEqual(['X', 'A', 'C', 'Y']);
        expect(d.counts.moves).toBe(0);
    });

    it('lands on the wanted order for random sequences with repeats', () => {
        const next = random(7);
        const pick = (): string[] => {
            const n = Math.floor(next() * 9);
            return Array.from({ length: n }, () => 'ABCDEF'[Math.floor(next() * 6)]);
        };
        const d = door();
        const src = driven(d.kids, pick(), d.build);
        for (let step = 0; step < 2000; step++) {
            const want = pick();
            src.setValue(want);
            expect(shown(d.rows)).toEqual(want);
        }
    });
});

describe('createExoKeyedList', () => {
    type TUser = { readonly id: number; readonly name: string };
    const users = (pairs: readonly (readonly [number, string])[]): TUser[] =>
        pairs.map(([id, name]) => ({ id, name }));

    const setup = (initial: readonly TUser[]) => {
        const rows: { name: string }[] = [];
        const updates: string[] = [];
        const kids: TExoPlacedChildren<{ name: string }> = {
            get size() {
                return rows.length;
            },
            at: (i) => rows[i],
            insert: (child, i = rows.length) => {
                rows.splice(i, 0, child);
            },
            move: (from, to) => {
                const [row] = rows.splice(from, 1);
                rows.splice(to, 0, row);
            },
            remove: (i) => {
                rows.splice(i, 1);
            },
            removeAll: () => {
                rows.length = 0;
            },
        };
        const list = createExoKeyedList(
            kids,
            (user: TUser) => user.id,
            (user) => ({ name: user.name }),
            (row, user) => {
                updates.push(user.name);
                row.name = user.name;
            }
        );
        list.reconcile(initial);
        const src = { setValue: (next: readonly TUser[]) => list.reconcile(next) };
        return { rows, updates, src };
    };

    it('gives each occurrence of a repeated key its own row, and keeps both through a reorder', () => {
        const s = setup(
            users([
                [1, 'ada'],
                [1, 'ada'],
                [2, 'bob'],
            ])
        );
        expect(s.rows.map((row) => row.name)).toEqual(['ada', 'ada', 'bob']);
        const [firstAda, secondAda] = s.rows;

        s.src.setValue(
            users([
                [2, 'bob'],
                [1, 'ada'],
                [1, 'ada'],
            ])
        );

        expect(s.rows.map((row) => row.name)).toEqual(['bob', 'ada', 'ada']);
        expect(s.rows[1]).toBe(firstAda);
        expect(s.rows[2]).toBe(secondAda);
    });

    it('keeps the row of a surviving key and updates it with the fresh object', () => {
        const s = setup(
            users([
                [1, 'ada'],
                [2, 'bob'],
            ])
        );
        const first = s.rows[0];

        s.src.setValue(
            users([
                [2, 'bob'],
                [1, 'ada lovelace'],
            ])
        );

        expect(s.rows.map((row) => row.name)).toEqual(['bob', 'ada lovelace']);
        expect(s.rows[1]).toBe(first);
        expect(s.updates).toEqual(['bob', 'ada lovelace']);
    });

    it('does not update a row whose object is the same one', () => {
        const initial = users([
            [1, 'ada'],
            [2, 'bob'],
        ]);
        const s = setup(initial);

        s.src.setValue([initial[1], initial[0]]);

        expect(s.updates).toEqual([]);
        expect(s.rows.map((row) => row.name)).toEqual(['bob', 'ada']);
    });

    it('builds a new key and drops a gone one', () => {
        const s = setup(
            users([
                [1, 'ada'],
                [2, 'bob'],
            ])
        );

        s.src.setValue(
            users([
                [3, 'cy'],
                [1, 'ada'],
            ])
        );

        expect(s.rows.map((row) => row.name)).toEqual(['cy', 'ada']);
    });
});
