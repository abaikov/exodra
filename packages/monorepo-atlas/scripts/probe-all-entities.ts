import { extractEntities } from '../src/model/extractEntities';
import { layoutModel } from '../src/layout/layoutModel';
import { discoverWorkspace } from '../src/generate/discoverWorkspace';
import { gzipSync } from 'node:zlib';

const packages = discoverWorkspace(process.cwd()).filter(p => p.kind !== 'app');
const started = Date.now();
const bundles: Record<string, unknown> = {};
let entities = 0;
for (const pkg of packages) {
    const model = extractEntities({ include: [`${pkg.dir}/src/**/*.ts`] });
    if (model.nodes.length === 0) continue;
    entities += model.nodes.length;
    bundles[pkg.name] = { model, layout: layoutModel(model) };
}
const json = JSON.stringify(bundles);
console.log(
    `${Object.keys(bundles).length} пакетов, ${entities} сущностей, ${(Date.now() - started) / 1000}s`
);
console.log(`общий json: ${(json.length / 1024).toFixed(0)} kB → gzip ${(gzipSync(json).length / 1024).toFixed(0)} kB`);
const biggest = Object.entries(bundles)
    .map(([name, b]) => [name, JSON.stringify(b).length] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
for (const [name, size] of biggest) console.log(`  ${name}: ${(size / 1024).toFixed(0)} kB`);
