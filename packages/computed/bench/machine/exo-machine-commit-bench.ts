import { EXO_MACHINE_COMMIT_SCENES } from './constants/EXO_MACHINE_COMMIT_SCENES';
import { EXO_MACHINE_COMMIT_VARIANTS } from './EXO_MACHINE_COMMIT_VARIANTS';
import { createExoBenchRunner } from '@exodra/bench-harness';
import { runExoBench } from '@exodra/bench-harness';
import type { TExoBenchInput } from '@exodra/bench-harness';
import type { TExoCommitScene } from './types/TExoCommitScene';

// `commitExoMachine` is the walk every transition ends with. Its mask against no mask at all,
// against the wake chains this package ships and has never measured, against the six lines a
// hand-written program would hold.

function line(text: string): void {
    console.log(`✅ ${text}`);
}

function refuse(text: string): void {
    console.log(`❌ ${text}`);
}

const GATE_CALLS = 128;
const FIELD_ROWS = 6;

function floorFieldsOf(scene: TExoCommitScene): readonly number[] {
    const s = scene.floorState;
    return [s.quantity, s.unitPrice, s.discount, s.taxRate, s.currency, s.subtotal];
}

/**
 * THE SAME PORTS AND THE SAME FIELDS OR NOTHING IS TIMED, and the gate runs the TIMED LOOPS rather
 * than a re-statement of them: every variant drives a scene of its own instances and the results
 * are compared afterwards. A design that settles a machine to different numbers is not a faster
 * design, and a table that ranked it would be ranking a defect.
 *
 * THE PENDING ROW IS NOT COMPARED, and that is deliberate: `chain·wakes` never writes one, because
 * running the derivations at the write is exactly what it does instead of leaving a word for a
 * commit to walk.
 */
function gate(): boolean {
    let bad = 0;
    let checked = 0;
    for (const shape of EXO_MACHINE_COMMIT_SCENES) {
        const scene = shape.build(GATE_CALLS);
        for (const variant of EXO_MACHINE_COMMIT_VARIANTS) variant.drive(scene);

        const wantPorts = scene.node.ports;
        const wantFields = scene.node.managedState;
        const rows: readonly (readonly [string, readonly unknown[], readonly unknown[]])[] = [
            ['shipped·twin', scene.twinNode.ports, scene.twinNode.managedState],
            ['dense·fill', scene.denseNode.ports, scene.denseNode.managedState],
            ['chain·wakes', scene.chainNode.ports, scene.chainNode.managedState],
            ['floor·straight', scene.floorPorts, floorFieldsOf(scene)],
        ];
        for (const [name, ports, fields] of rows) {
            for (let p = 0; p < wantPorts.length; p++) {
                checked++;
                if (ports[p] === wantPorts[p]) continue;
                bad++;
                refuse(
                    `GATE ${scene.name}: ${name} port ${p} settled to ${String(ports[p])} where ` +
                        `shipped settles to ${String(wantPorts[p])}`
                );
            }
            for (let f = 0; f < FIELD_ROWS; f++) {
                checked++;
                if (fields[f] === wantFields[f]) continue;
                bad++;
                refuse(
                    `GATE ${scene.name}: ${name} field ${f} settled to ${String(fields[f])} ` +
                        `where shipped settles to ${String(wantFields[f])}`
                );
            }
        }
    }
    if (bad > 0) {
        refuse(`GATE FAILED on ${bad} of ${checked} settled values — NOTHING TIMED.`);
        return false;
    }
    line(
        `GATE: four designs settle to identical ports and fields after ${GATE_CALLS} transitions ` +
            `on each of ${EXO_MACHINE_COMMIT_SCENES.length} transition shapes (${checked} values).`
    );
    return true;
}

const INPUTS: readonly TExoBenchInput<TExoCommitScene>[] = EXO_MACHINE_COMMIT_SCENES.map(
    (shape) => ({
        name: shape.name,
        why: shape.why,
        build: (calls: number): TExoCommitScene => shape.build(calls),
        // ONE TRANSITION IS ONE CALL, whatever it wakes: the column is what settling a machine
        // costs, which is the number a page pays per event.
        size: (scene: TExoCommitScene): number => scene.stream.length,
    })
);

function epilogue(): void {
    line('');
    line('HOT — once per transition, on every state change a machine owns:');
    line(
        '  packages/computed/src/transitions/exoMachineSettle.ts:11, :14 — commitExoMachine, the subject'
    );
    line(
        '  packages/computed/src/transitions/exoTransition.ts:30 — settle(enode), after every apply'
    );
    line(
        '  packages/computed/src/wiring/constants/EXO_HOLD_VOCABULARY.ts:35 — once at the end of every hold'
    );
    refuse('NOT ON THIS PATH — once per instance at mount, and a different subject:');
    refuse(
        '  packages/computed/src/computed/withExoComputedMachine.ts:59 — fillExoMachineDerivations'
    );
    refuse('  packages/computed/src/wiring/ExoWiringBlock.ts:324 — the same, for a wiring block');
    refuse('ONLY WHEN A MACHINE DECLARES BODIES, which this table deliberately does not:');
    refuse(
        '  packages/computed/src/transitions/exoMachineSettle.ts:15 and exo-hold-pack.ts:36 — ' +
            'runExoMachineSlots is reached only when bodyMask is non-zero, and ' +
            'exoMachineSettle.ts:9 picks a settle function WITHOUT it otherwise'
    );
    line('');
    line(
        'ADJACENT TO A RECORDED FIGURE, NOT A REPRODUCTION OF IT. This repository records the ' +
            'derivation walk on the app-update axis at 0.200 ms over six hand-written writes, ' +
            "twice that run's floor. That figure is a whole page updating through a backend; the " +
            'table above settles one machine with nothing attached. Read it as what the walk ' +
            'costs per transition, and go to packages/benchmarks for what a page pays.'
    );
    line(
        'WHAT chain·wakes CANNOT DO, whatever this table says: coalesce. Two writes reaching one ' +
            'derivation run it twice, where a marked bit is set twice and walked once — which is ' +
            'why hold() parks the chain table (exo-hold-pack.ts:28) and takes the walk instead. ' +
            'Its own header calls it AN EXPERIMENT, AND UNMEASURED; this is the measurement, and ' +
            'it is a measurement of one transition at a time.'
    );
}

runExoBench({
    title: 'commitExoMachine — a pending-word walk against no mask, wake chains and six lines',
    subtitle:
        'packages/computed/src, read as source; programs are compiled and instances filled ' +
        'outside every timed region, as module load and mount do',
    gate: gate,
    tables: [
        createExoBenchRunner({
            title: 'commit [computed/src/commitExoMachine.ts:12]',
            floorName: 'floor·straight',
            floorLabel: '×floor',
            nullPair: ['shipped', 'shipped·twin'],
            variants: EXO_MACHINE_COMMIT_VARIANTS,
            inputs: INPUTS,
        }),
    ],
    epilogue: epilogue,
    defaultRounds: 40,
    defaultCalls: 20000,
});
