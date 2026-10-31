import { EXO_FILL_MARKUP_SCENES } from '../constants/EXO_FILL_MARKUP_SCENES';
import { EXO_FILL_MARKUP_VARIANTS } from './EXO_FILL_MARKUP_VARIANTS';
import { createExoBenchRunner } from '@exodra/bench-harness';
import { runExoBench } from '@exodra/bench-harness';
import type { TExoBenchInput } from '@exodra/bench-harness';
import type { TExoFillMarkupScene } from '../types/TExoFillMarkupScene';
import type { TExoStrMarkupFiller } from '../../src/markup/types/TExoStrMarkupFiller';

// `createExoMarkupFiller`'s written-out arity ladder against the loop it falls back to, against two
// `Array.join` designs, against a hand-written template with the static pieces as LITERALS.

function line(text: string): void {
    console.log(`✅ ${text}`);
}

function refuse(text: string): void {
    console.log(`❌ ${text}`);
}

const GATE_CALLS = 64;

/**
 * CHARACTER-IDENTICAL MARKUP OR NOTHING IS TIMED, and the hand-written floor is in the gate on
 * exactly the same terms as everything else: if a literal in it drifts from the `pieces` array
 * beside it, the run stops rather than publishing a floor that renders a different page.
 */
function gate(): boolean {
    let bad = 0;
    let checked = 0;
    for (const shape of EXO_FILL_MARKUP_SCENES) {
        const scene = shape.build(GATE_CALLS);
        const candidates: readonly { readonly name: string; readonly fill: TExoStrMarkupFiller }[] =
            [
                { name: 'shipped', fill: scene.shipped },
                { name: 'shipped·twin', fill: scene.twin },
                { name: 'loop·always', fill: scene.loop },
                { name: 'join·array', fill: scene.joinArray },
                { name: 'join·reused', fill: scene.joinReused },
                { name: 'floor·literal', fill: scene.floor },
            ];
        for (const values of scene.streams) {
            const want = scene.shipped(values);
            for (const candidate of candidates) {
                const got = candidate.fill(values);
                checked++;
                if (got === want) continue;
                bad++;
                refuse(
                    `GATE ${scene.name}: ${candidate.name} produced ${JSON.stringify(got)} where ` +
                        `shipped produces ${JSON.stringify(want)}`
                );
            }
        }
    }
    if (bad > 0) {
        refuse(`GATE FAILED on ${bad} of ${checked} renders — NOTHING TIMED.`);
        return false;
    }
    line(
        `GATE: six designs agree character for character on ${checked} renders across ` +
            `${EXO_FILL_MARKUP_SCENES.length} template shapes.`
    );
    return true;
}

const FLATTEN: readonly string[] = ['shipped·noflat'];
const FLATTEN_WHY =
    'the same bytes with the FLATTEN left out — it never reads the cons string `+=` built';

const INPUTS: readonly TExoBenchInput<TExoFillMarkupScene>[] = EXO_FILL_MARKUP_SCENES.map(
    (shape) => ({
        name: shape.name,
        why: shape.why,
        build: (calls: number): TExoFillMarkupScene => shape.build(calls),
        size: (scene: TExoFillMarkupScene): number => scene.streams.length,
        bounds: FLATTEN,
        boundsWhy: FLATTEN_WHY,
    })
);

function epilogue(): void {
    line('');
    line('HOT — once per instance per render, which on a list is once per row:');
    line('  packages/string/src/node/renderExoStrInstance.ts:17 — schema.fillMarkup(node.values)');
    line(
        '  reached from packages/string/src/node/EXO_STR_NODE_VOCABULARY.ts:125 (one), :144 (list), :168 ' +
            '(bindOne), :186 (bindMany), :201 (build)'
    );
    refuse('NOT HOT — once per (schema, backend), cached on the schema:');
    refuse(
        '  packages/string/src/schema/compileExoStrSchema.ts:382 — createExoMarkupFiller(pieces, order)'
    );
    line('');
    line(
        'WHAT THE LADDER IS WORTH is the ports·8 to ports·9 step read against the scatter: nine ' +
            'pieces is its last written-out rung and ten pieces falls to the loop, so if the two ' +
            'rows land inside the scatter the switch in exo-markup-filler.ts:6 is buying nothing ' +
            'the loop would not.'
    );
    line(
        'THE `+=` VERSUS `join` QUESTION is asserted without a number in three places in this ' +
            'repository, among them packages/string/src/node/EXO_STR_NODE_VOCABULARY.ts:150 and ' +
            'packages/string/src/markup/factories/createExoMarkupFiller.ts:83. join·array and join·reused split it: ' +
            'the first pays for an array per call, the second does not, and both pay the eager ' +
            'copy that `+=` defers to whoever reads the string.'
    );
}

runExoBench({
    title: 'createExoMarkupFiller — an arity ladder, a loop, two joins and a hand-written template',
    subtitle:
        'packages/string/src/markup/factories/createExoMarkupFiller.ts:5, read as source; every row flattens its ' +
        'result inside the timed region, and the row that does not is marked a bound',
    gate: gate,
    tables: [
        createExoBenchRunner({
            title: 'fillMarkup [string/src/renderExoStrInstance.ts:17]',
            floorName: 'floor·literal',
            floorLabel: '×floor',
            nullPair: ['shipped', 'shipped·twin'],
            variants: EXO_FILL_MARKUP_VARIANTS,
            inputs: INPUTS,
        }),
    ],
    epilogue: epilogue,
    defaultRounds: 40,
    defaultCalls: 20000,
});
