import type { TExoPortTable } from '@exodra/core';
import type { TExoBenchVariant } from '@exodra/bench-harness';
import type { TExoStrSetScene } from '../types/TExoStrSetScene';

// Each drive writes EVERY PORT OF ONE INSTANCE and then moves to the next, which is the order
// `renderExoStrInstance` produces and the order a writer call site really sees. Reading one slot back
// per instance is what keeps the writes observable.

function driveShipped(scene: TExoStrSetScene): number {
    const node = scene.node;
    const ports = scene.ports;
    const streams = scene.streams;
    let acc = 0;
    for (let i = 0; i < streams.length; i++) {
        const values = streams[i];
        for (let p = 0; p < ports.length; p++) node.attr(ports[p], values[p]);
        acc += node.values[0].length;
    }
    return acc;
}

function driveTwin(scene: TExoStrSetScene): number {
    const node = scene.twinNode;
    const ports = scene.ports;
    const streams = scene.streams;
    let acc = 0;
    for (let i = 0; i < streams.length; i++) {
        const values = streams[i];
        for (let p = 0; p < ports.length; p++) node.attr(ports[p], values[p]);
        acc += node.values[0].length;
    }
    return acc;
}

// The SHIPPED closure from `TExoStrNode.portNodeWriter`: one captured writer array, three
// arguments, no receiver. It is the door a decorated machine writes ports through.
function driveSchemaWrite(scene: TExoStrSetScene): number {
    const write = scene.schemaWrite;
    const table = scene.schemaTable as unknown as TExoPortTable;
    const slots = scene.schemaTable;
    const ports = scene.ports;
    const streams = scene.streams;
    let acc = 0;
    for (let i = 0; i < streams.length; i++) {
        const values = streams[i];
        for (let p = 0; p < ports.length; p++) write(table, ports[p], values[p]);
        acc += slots[0].length;
    }
    return acc;
}

// The writer on the PORT instead of in a parallel array: one indexed load per write instead of two,
// paid for by a field on an object there is one of per template.
function driveWritePort(scene: TExoStrSetScene): number {
    const ports = scene.writePorts;
    const slots = scene.writeValues;
    const streams = scene.streams;
    let acc = 0;
    for (let i = 0; i < streams.length; i++) {
        const values = streams[i];
        for (let p = 0; p < ports.length; p++) {
            const port = ports[p];
            slots[port.index] = port.write(values[p]);
        }
        acc += slots[0].length;
    }
    return acc;
}

/**
 * THE NATIVE FLOOR: no port objects, no writer table, no dispatch — the attribute head and the
 * escaper written into the line that does the write, which is what a hand-written server contains.
 */
function driveFloor(scene: TExoStrSetScene): number {
    const floor = scene.floor;
    const slots = scene.floorValues;
    const streams = scene.streams;
    let acc = 0;
    for (let i = 0; i < streams.length; i++) {
        floor(slots, streams[i]);
        acc += slots[0].length;
    }
    return acc;
}

export const EXO_STR_SET_VARIANTS: readonly TExoBenchVariant<TExoStrSetScene>[] = [
    { name: 'shipped', drive: driveShipped },
    { name: 'shipped·twin', drive: driveTwin },
    { name: 'schema·write', drive: driveSchemaWrite },
    { name: 'writer·on·port', drive: driveWritePort },
    { name: 'floor·inline', drive: driveFloor },
];
