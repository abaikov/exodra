import { connectExoNode, disconnectExoNode, withExoEffects } from '@exodra/core';
import type { TExoMachine } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import type {
    TOIMBucketContentSlot,
    TOIMBucketSlotsArrayStore,
    TOIMDisposer,
    TOIMOrderedListCommand,
    TOIMSlot,
} from '@oimdb/core';
import { EXO_OIM_PARKED_BY_OWNER } from './constants/EXO_OIM_PARKED_BY_OWNER';
import type { TExoOimBucketListOptions } from './types/TExoOimBucketListOptions';
import type { TExoOimParkedRow } from './types/TExoOimParkedRow';
import type { TExoOimRow } from './types/TExoOimRow';

const slotOfRow = new WeakMap<TExoOimRow, TOIMSlot>();
const tornDownWith = new WeakSet<object>();

function parkedOf(owner: object): Set<TOIMSlot> {
    let parked = EXO_OIM_PARKED_BY_OWNER.get(owner);
    if (parked === undefined) {
        parked = new Set();
        EXO_OIM_PARKED_BY_OWNER.set(owner, parked);
    }
    return parked;
}

function park(cell: number, owner: object, node: TExoOimRow): void {
    const slot = slotOfRow.get(node);
    const data = slot === undefined ? undefined : (slot.data ??= []);
    const taken = data?.[cell] as TExoOimParkedRow | undefined;
    if (
        slot === undefined ||
        data === undefined ||
        (taken !== undefined && taken.owner !== owner)
    ) {
        node.unmount();
        return;
    }
    if (taken !== undefined) taken.node.unmount();
    data[cell] = { owner, node } satisfies TExoOimParkedRow;
    parkedOf(owner).add(slot);
    disconnectExoNode(node);
}

function unpark(cell: number, owner: object, slot: TOIMSlot): TExoOimRow | undefined {
    const data = slot.data;
    const parked = data?.[cell] as TExoOimParkedRow | undefined;
    if (data === undefined || parked === undefined || parked.owner !== owner) return undefined;
    data[cell] = undefined;
    parkedOf(owner).delete(slot);
    return parked.node;
}

function dropParked(cell: number, owner: object): void {
    const parked = EXO_OIM_PARKED_BY_OWNER.get(owner);
    if (parked === undefined) return;
    for (const slot of parked) {
        const node = unpark(cell, owner, slot);
        if (node !== undefined) node.unmount();
    }
    parked.clear();
}

export function withExoOimBucketList<
    TWiring extends TExoDomNode,
    TPorts,
    TParams,
    TState,
    TMember extends TOIMSlot,
    TMachine extends TExoMachine<TWiring, TPorts, TParams, TState>
>(
    machine: TMachine & TExoMachine<TWiring, TPorts, TParams, TState>,
    options: TExoOimBucketListOptions<TWiring & { state: TState }, TWiring, TMember>
): TMachine {
    const { rows: rowsOf, cell: cellOf, row, bucket: bucketOf, reselectOn } = options;
    type TBucket = TOIMBucketContentSlot<TOIMBucketSlotsArrayStore<TMember>, TMember>;
    return withExoEffects(machine, (effect) => {
        effect((c) => {
            const rows = rowsOf(c);
            const cell = cellOf(c);
            if (!tornDownWith.has(c)) {
                tornDownWith.add(c);
                c.onTeardown(() => dropParked(cell, c));
            }
            let shown: TBucket | null = null;
            let stopShown: TOIMDisposer | null = null;
            let fresh = true;
            let startedAtRevision = -1;
            let startedAtEpoch = -1;
            let replayed = 0;

            const place = (slot: TMember, at?: number): void => {
                const parked = unpark(cell, c, slot);
                if (parked !== undefined) {
                    connectExoNode(parked, row);
                    rows.attach(parked, at);
                    return;
                }
                const built = c.build(row, slot) as unknown as TExoOimRow;
                slotOfRow.set(built, slot);
                rows.insert(built, at);
            };
            const rebuild = (slots: Iterable<TMember>): void => {
                for (const node of rows.detachAll()) park(cell, c, node as TExoOimRow);
                for (const slot of slots) place(slot);
            };
            const replay = (commands: readonly TOIMOrderedListCommand[], from: number): void => {
                for (let i = from; i < commands.length; i++) {
                    const command = commands[i];
                    if (command.type === 'insert') {
                        place(command.slot as TMember, command.index);
                    } else if (command.type === 'remove') {
                        const node = rows.detach(command.index);
                        if (node !== undefined) park(cell, c, node as TExoOimRow);
                    } else if (command.type === 'move') {
                        rows.move(command.from, command.to);
                    } else {
                        rebuild(command.slots as readonly TMember[]);
                    }
                }
            };
            const follow = (bucket: TBucket): void => {
                if (bucket !== shown) return;
                const commands = bucket.commands;
                if (fresh || bucket.isWholeListRecorded) {
                    fresh = false;
                    rebuild(bucket.getBucketMemberSlots());
                } else if (commands !== undefined) {
                    const sameScript =
                        bucket.commandsStartedAtRevision === startedAtRevision &&
                        bucket.commandsStartedAtEpoch === startedAtEpoch;
                    replay(commands, sameScript ? replayed : 0);
                }
                startedAtRevision = bucket.commandsStartedAtRevision;
                startedAtEpoch = bucket.commandsStartedAtEpoch;
                replayed = bucket.commands?.length ?? 0;
            };
            const select = (): void => {
                const next = bucketOf(c);
                if (next === shown) return;
                stopShown?.();
                shown = next;
                fresh = true;
                stopShown = next.watch(follow);
            };

            const stops =
                reselectOn === undefined ? [] : reselectOn(c).map((slot) => slot.watch(select));
            if (stops.length === 0) select();
            return () => {
                for (const stop of stops) stop();
                stopShown?.();
                stopShown = null;
                shown = null;
            };
        });
    });
}
