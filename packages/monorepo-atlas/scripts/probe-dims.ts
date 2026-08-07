import { cruiseWorkspace } from '../src/generate/cruiseWorkspace';
import { discoverWorkspace } from '../src/generate/discoverWorkspace';
import { buildModel, withoutExternal } from '../src/model/buildModel';
import { layoutModel } from '../src/layout/layoutModel';

async function main() {
    const root = process.cwd();
    const cruise = await cruiseWorkspace(root);
    const model = withoutExternal(
        buildModel(cruise, { granularity: 'package', packages: discoverWorkspace(root) })
    );
    for (const dir of ['TB', 'LR'] as const) {
        const l = layoutModel(model, { rankdir: dir } as never);
        console.log(
            `${dir}: ${l.width}×${l.height}  соотношение ${(l.width / l.height).toFixed(1)}:1`
        );
    }
}
main().catch(e => { console.error(e.message); process.exit(1); });
