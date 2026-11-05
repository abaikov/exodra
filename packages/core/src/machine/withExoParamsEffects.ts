import { refuseExoSecondWire } from './asserts/refuseExoSecondWire';
import { withExoEffects } from './withExoEffects';
import type { TExoMachine } from './types/TExoMachine';
import type { TExoMachineEffect } from './types/TExoMachineEffect';
import type { TExoMachineNode } from './types/TExoMachineNode';
import type { TExoParamsWire } from './types/TExoParamsWire';

type TExoWire = (enode: TExoMachineNode, params: unknown) => void;

type TExoParamsEffect = {
    readonly key: (params: unknown) => unknown;
    readonly start: (enode: TExoMachineNode, params: unknown) => (() => void) | null;
};

export function withExoParamsEffects<
    TWiring,
    TPorts,
    TParams,
    TState,
    TMachine extends TExoMachine<TWiring, TPorts, TParams, TState>,
    TNames extends string
>(
    machine: TMachine & TExoMachine<TWiring, TPorts, TParams, TState>,
    effects: {
        readonly [K in TNames]: {
            readonly key: (params: TParams) => unknown;
            readonly start: (
                enode: TWiring & { state: TState },
                params: TParams
            ) => (() => void) | null;
        };
    }
): TMachine & {
    readonly effects: TMachine['effects'] & {
        readonly [K in TNames]: TExoMachineEffect<TWiring>;
    };
} {
    const declared = effects as unknown as Readonly<Record<string, TExoParamsEffect>>;
    const names = Object.keys(declared);
    const starts: Record<string, (enode: TExoMachineNode) => (() => void) | null> = {};
    for (let i = 0; i < names.length; i++) {
        const effect = declared[names[i]];
        starts[names[i]] = (enode) => effect.start(enode, enode.serviceState);
    }
    const named = withExoEffects(
        machine as unknown as TExoMachine<TExoMachineNode>,
        starts
    ) as unknown as TExoMachine<TExoMachineNode> & {
        readonly effects: Readonly<Record<string, TExoMachineEffect<TExoMachineNode>>>;
    };
    const handles: TExoMachineEffect<TExoMachineNode>[] = [];
    const keys: ((params: unknown) => unknown)[] = [];
    for (let i = 0; i < names.length; i++) {
        handles.push(named.effects[names[i]]);
        keys.push(declared[names[i]].key);
    }
    return {
        ...named,
        wire: createExoParamsWire(machine.wire as TExoWire | undefined, keys, handles),
    } as unknown as TMachine & {
        readonly effects: TMachine['effects'] & {
            readonly [K in TNames]: TExoMachineEffect<TWiring>;
        };
    };
}

function createExoParamsWire(
    inner: TExoWire | undefined,
    keys: readonly ((params: unknown) => unknown)[],
    handles: readonly TExoMachineEffect<TExoMachineNode>[]
): TExoParamsWire {
    const wire = function (this: unknown, enode: TExoMachineNode, params: unknown): void {
        const previous = enode.serviceState;
        if (inner !== undefined) inner.call(this, enode, params);
        enode.serviceState = params;
        if (enode.effectStops === null) return;
        for (let i = 0; i < keys.length; i++) {
            if (!Object.is(keys[i](previous), keys[i](params))) enode.restartEffect(handles[i]);
        }
    } as TExoWire & { aroundWire?: TExoParamsWire['aroundWire'] };
    wire.aroundWire = (user) => {
        if (inner === undefined) return createExoParamsWire(user, keys, handles);
        const nested = (inner as Partial<TExoParamsWire>).aroundWire;
        if (nested === undefined) {
            refuseExoSecondWire();
        }
        return createExoParamsWire(nested(user), keys, handles);
    };
    return wire as TExoParamsWire;
}
