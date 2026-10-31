import type { TExoPortNodeReader, TExoPortTable, TExoRefPort } from '@exodra/core';
import { readExoControlValue } from './readExoControlValue';
import type { TExoControlValue } from '../types/TExoControlValue';

// The LIVE controls: what a person typed before the bundle arrived is what comes back.
export function readExoControlValues(
    c: {
        portTable(): TExoPortTable;
        portNodeReader(): TExoPortNodeReader<EventTarget | undefined>;
    },
    ports: readonly TExoRefPort[]
): (TExoControlValue | undefined)[] {
    const table = c.portTable();
    const read = c.portNodeReader();
    const values = new Array<TExoControlValue | undefined>(ports.length);
    for (let i = 0; i < ports.length; i++) values[i] = readExoControlValue(read(table, ports[i]));
    return values;
}
