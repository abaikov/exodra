import type { TExoPortNodeReader, TExoPortTable, TExoRefPort } from '@exodra/core';

type TExoValidatedControl = { setCustomValidity(message: string): void };

export function setExoControlErrors(
    c: {
        portTable(): TExoPortTable;
        portNodeReader(): TExoPortNodeReader<EventTarget | undefined>;
    },
    ports: readonly TExoRefPort[],
    errors: readonly (string | null)[]
): void {
    const table = c.portTable();
    const read = c.portNodeReader();
    for (let i = 0; i < ports.length; i++) {
        const control = read(table, ports[i]) as Partial<TExoValidatedControl> | undefined;
        if (control === undefined || typeof control.setCustomValidity !== 'function') continue;
        control.setCustomValidity(errors[i] ?? '');
    }
}
