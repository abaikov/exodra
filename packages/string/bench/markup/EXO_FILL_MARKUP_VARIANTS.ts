import type { TExoBenchVariant } from '@exodra/bench-harness';
import type { TExoFillMarkupScene } from '../types/TExoFillMarkupScene';

// EVERY LOOP READS A CHARACTER OUT OF THE RESULT, and that is the fairness of this whole table.
// `+=` hands back a cons string; a run that never touched the result would charge the `+=` rows
// nothing for a flatten that `Array.join` pays eagerly, which is exactly the rig
// `packages/benchmarks/README.md` describes. `charCodeAt` forces V8 to flatten — an assumption
// about the engine, and `shipped·noflat` is in the table so the assumption has a price beside it.
//
// One limitation, stated rather than hidden: a filler's code object differs per arity (the ladder
// has a case per arity, the loop has one), so each `fill(...)` site below sees six shapes over a
// whole run. The tax is identical for every row and every table is read within one arity.

function driveShipped(scene: TExoFillMarkupScene): number {
    const fill = scene.shipped;
    const streams = scene.streams;
    let acc = 0;
    for (let i = 0; i < streams.length; i++) acc += fill(streams[i]).charCodeAt(0);
    return acc;
}

function driveTwin(scene: TExoFillMarkupScene): number {
    const fill = scene.twin;
    const streams = scene.streams;
    let acc = 0;
    for (let i = 0; i < streams.length; i++) acc += fill(streams[i]).charCodeAt(0);
    return acc;
}

function driveLoop(scene: TExoFillMarkupScene): number {
    const fill = scene.loop;
    const streams = scene.streams;
    let acc = 0;
    for (let i = 0; i < streams.length; i++) acc += fill(streams[i]).charCodeAt(0);
    return acc;
}

function driveJoinArray(scene: TExoFillMarkupScene): number {
    const fill = scene.joinArray;
    const streams = scene.streams;
    let acc = 0;
    for (let i = 0; i < streams.length; i++) acc += fill(streams[i]).charCodeAt(0);
    return acc;
}

function driveJoinReused(scene: TExoFillMarkupScene): number {
    const fill = scene.joinReused;
    const streams = scene.streams;
    let acc = 0;
    for (let i = 0; i < streams.length; i++) acc += fill(streams[i]).charCodeAt(0);
    return acc;
}

function driveFloor(scene: TExoFillMarkupScene): number {
    const fill = scene.floor;
    const streams = scene.streams;
    let acc = 0;
    for (let i = 0; i < streams.length; i++) acc += fill(streams[i]).charCodeAt(0);
    return acc;
}

/**
 * THE SAME BYTES, ONE STEP SHORT: it never reads the result, so the cons string `+=` built is
 * never flattened. It is in the table to price the flatten every other row pays, and it is not a
 * candidate — a renderer that never flattens hands its caller a rope, and the caller flattens it.
 */
function driveShippedNoFlat(scene: TExoFillMarkupScene): number {
    const fill = scene.shipped;
    const streams = scene.streams;
    let acc = 0;
    for (let i = 0; i < streams.length; i++) acc += fill(streams[i]).length;
    return acc;
}

export const EXO_FILL_MARKUP_VARIANTS: readonly TExoBenchVariant<TExoFillMarkupScene>[] = [
    { name: 'shipped', drive: driveShipped },
    { name: 'shipped·twin', drive: driveTwin },
    { name: 'loop·always', drive: driveLoop },
    { name: 'join·array', drive: driveJoinArray },
    { name: 'join·reused', drive: driveJoinReused },
    { name: 'floor·literal', drive: driveFloor },
    { name: 'shipped·noflat', drive: driveShippedNoFlat },
];
