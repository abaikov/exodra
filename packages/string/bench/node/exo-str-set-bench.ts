import type { TExoPortTable } from '@exodra/core';
import { EXO_STR_SET_SCENES } from '../constants/EXO_STR_SET_SCENES';
import { EXO_STR_SET_VARIANTS } from './EXO_STR_SET_VARIANTS';
import { createExoBenchRunner } from '@exodra/bench-harness';
import { runExoBench } from '@exodra/bench-harness';
import type { TExoBenchInput } from '@exodra/bench-harness';
import type { TExoStrSetScene } from '../types/TExoStrSetScene';

// `TExoStrNode.set` is two indexed loads and a call, per written port per instance. Four designs
// for that dispatch — the shipped method, the shipped schema closure, a writer carried on the port,
// and no dispatch at all — on port mixes of one, three and five writer identities.

function line(text: string): void {
    console.log(`✅ ${text}`);
}

function refuse(text: string): void {
    console.log(`❌ ${text}`);
}

const GATE_CALLS = 64;

/**
 * CHARACTER-IDENTICAL SLOTS OR NOTHING IS TIMED. The floor is in the gate on the same terms as
 * everything else, which is what stops it from becoming a faster program that renders a different
 * attribute — the one failure mode an inlined attribute head has.
 */
function gate(): boolean {
    let bad = 0;
    let checked = 0;
    for (const shape of EXO_STR_SET_SCENES) {
        const scene = shape.build(GATE_CALLS);
        const table = scene.schemaTable as unknown as TExoPortTable;
        for (const values of scene.streams) {
            for (let p = 0; p < scene.ports.length; p++) {
                scene.node.attr(scene.ports[p], values[p]);
                scene.twinNode.attr(scene.ports[p], values[p]);
                scene.schemaWrite(table, scene.ports[p], values[p]);
                const port = scene.writePorts[p];
                scene.writeValues[port.index] = port.write(values[p]);
            }
            scene.floor(scene.floorValues, values);
            for (let s = 0; s < scene.ports.length; s++) {
                const want = scene.node.values[s];
                const rows: readonly (readonly [string, string])[] = [
                    ['shipped·twin', scene.twinNode.values[s]],
                    ['schema·write', scene.schemaTable[s]],
                    ['writer·on·port', scene.writeValues[s]],
                    ['floor·inline', scene.floorValues[s]],
                ];
                for (const [name, got] of rows) {
                    checked++;
                    if (got === want) continue;
                    bad++;
                    refuse(
                        `GATE ${scene.name} slot ${s}: ${name} wrote ${JSON.stringify(got)} ` +
                            `where shipped writes ${JSON.stringify(want)}`
                    );
                }
            }
        }
    }
    if (bad > 0) {
        refuse(`GATE FAILED on ${bad} of ${checked} slots — NOTHING TIMED.`);
        return false;
    }
    line(
        `GATE: four designs write identical slots on ${checked} comparisons across ` +
            `${EXO_STR_SET_SCENES.length} port mixes.`
    );
    return true;
}

const INPUTS: readonly TExoBenchInput<TExoStrSetScene>[] = EXO_STR_SET_SCENES.map((shape) => ({
    name: shape.name,
    why: shape.why,
    build: (calls: number): TExoStrSetScene => shape.build(calls),
    // ONE WRITE IS ONE CALL: a five-port instance is five, so the column stays comparable between
    // a table whose rows have one port and a table whose rows have five.
    size: (scene: TExoStrSetScene): number => scene.streams.length * scene.ports.length,
}));

function epilogue(): void {
    line('');
    line('HOT — once per written port per instance per render:');
    line(
        '  packages/string/src/node/EXO_STR_NODE_VOCABULARY.ts:77 — set(), the door every wire writes through'
    );
    line(
        '  packages/string/src/node/EXO_STR_NODE_VOCABULARY.ts:114 — on(), the same two lines for an event port'
    );
    line('  packages/string/src/exo-str-bind.ts — bind(), reached once per bound port');
    line(
        '  packages/string/src/node/EXO_STR_NODE_VOCABULARY.ts:87 — portNodeWriter(), whose closure is built once ' +
            'per SCHEMA and then called per port by whatever decorates the instance'
    );
    line('');
    line(
        'WHAT A WIN HERE BUYS, from the recorded SSR ladder in packages/benchmarks: the census ' +
            'row is five ports and the axis renders 1000 of them, so one nanosecond off a write ' +
            'is 0.005 ms off that page. The ladder itself puts +set between two whole programs ' +
            'and that rung, not this table, is what prices the mechanism end to end.'
    );
    line(
        'WHAT IT DOES NOT MEASURE: the escaper inside every writer, which is most of what a write ' +
            'costs and is exo-escape-bench.ts. A gap between shipped and floor·inline here is ' +
            'dispatch plus the attribute head; the escaping is common to both sides.'
    );
}

runExoBench({
    title: 'TExoStrNode.set — four dispatch designs against a hand-written write',
    subtitle:
        'the SHIPPED functions, taken out of EXO_STR_NODE_VOCABULARY and given a real prototype — ' +
        'nothing here re-implements set() or portNodeWriter()',
    gate: gate,
    tables: [
        createExoBenchRunner({
            title: 'set [string/src/EXO_STR_NODE_VOCABULARY.ts:77]',
            floorName: 'floor·inline',
            floorLabel: '×floor',
            nullPair: ['shipped', 'shipped·twin'],
            variants: EXO_STR_SET_VARIANTS,
            inputs: INPUTS,
        }),
    ],
    epilogue: epilogue,
    defaultRounds: 40,
    defaultCalls: 20000,
});
