import { exoDomSchemaOf } from '@exodra/dom';
import type { TExoDomApi, TExoDomSchema, TExoDomSetter } from '@exodra/dom';
import type { TExoMachine, TExoAnyPort } from '@exodra/core';
import {
    EXO_PORT_ATTR,
    EXO_PORT_CHILDREN,
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    EXO_PORT_REF,
} from '@exodra/core';
import { now } from './now';

export interface TExoPortProfileEntry {
    port: number;
    label: string;
    count: number;
    totalMs: number;
    avgMs: number;
    maxMs: number;
}

export interface TExoPortProfiler {
    getReport(): TExoPortProfileEntry[];
    reset(): void;
    stop(): TExoPortProfileEntry[];
}

const labelOf = (port: TExoAnyPort | undefined, index: number): string => {
    if (port === undefined) return `#${index}`;
    if (port.kind === EXO_PORT_ATTR) return `attr:${port.name ?? '?'}`;
    if (port.kind === EXO_PORT_EVENT) return `event:${port.name ?? '?'}`;
    if (port.kind === EXO_PORT_TEXT) return 'text';
    if (port.kind === EXO_PORT_CHILDREN) return 'children';
    // A REF port has no writer and can never carry a non-zero time; labelled anyway so a report
    // shows every port of the schema.
    if (port.kind === EXO_PORT_REF) return 'ref';
    return `#${index}`;
};

// The sharpest instrument here and the most distorting: a setter's body is often one
// `setAttribute` and the wrapper costs several times that, so only the RATIOS between ports of one
// schema survive. Two fills are invisible and profiling must start before the render — README:
// "Per-port".
export function profilePorts(machine: TExoMachine<never>, backend: TExoDomApi): TExoPortProfiler {
    // The backend is required and must be the render's own object: a schema is cached per
    // (machine, backendType), so any other backend wraps a table nothing calls and every
    // report comes back empty with nothing thrown.
    const schema: TExoDomSchema = exoDomSchemaOf(machine, backend);
    // `readonly` to everything that RENDERS through it; profiling is the one caller that writes
    // here, and `stop()` puts every entry back.
    const setters = schema.setters as TExoDomSetter[];
    const originals = setters.slice();
    const ports = machine.declaration.portList;

    const samples = new Map<number, { count: number; total: number; max: number }>();

    for (let i = 0; i < setters.length; i++) {
        const original = originals[i];
        const index = i;
        const wrapped: TExoDomSetter = (node, value, subject) => {
            const start = now();
            try {
                original(node, value, subject);
            } finally {
                const durationMs = now() - start;
                let entry = samples.get(index);
                if (!entry) {
                    samples.set(index, (entry = { count: 0, total: 0, max: 0 }));
                }
                entry.count += 1;
                entry.total += durationMs;
                if (durationMs > entry.max) entry.max = durationMs;
            }
        };
        // The declaration must travel with the wrapper: `bind` reads it to decide whether it was
        // handed a Text node or an element, so a wrapper that dropped it would send a Text node
        // through the element path.
        if (original.takesTextNode === true) wrapped.takesTextNode = true;
        setters[index] = wrapped;
    }

    const getReport = (): TExoPortProfileEntry[] =>
        [...samples.entries()]
            .map(([port, e]) => ({
                port,
                label: labelOf(ports[port], port),
                count: e.count,
                totalMs: e.total,
                avgMs: e.total / e.count,
                maxMs: e.max,
            }))
            .sort((a, b) => b.totalMs - a.totalMs);

    let stopped = false;
    return {
        getReport,
        reset: () => samples.clear(),
        stop: () => {
            if (!stopped) {
                stopped = true;
                for (let i = 0; i < originals.length; i++) setters[i] = originals[i];
            }
            return getReport();
        },
    };
}
