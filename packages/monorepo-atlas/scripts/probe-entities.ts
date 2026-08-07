import { extractEntities } from '../src/model/extractEntities';
import { layoutModel } from '../src/layout/layoutModel';

const model = extractEntities({
    include: ['packages/dom/src/**/*.ts'],
});
console.log(`@exodra/dom: ${model.nodes.length} сущностей, ${model.edges.length} связей`);
const byKind = new Map<string, string[]>();
for (const n of model.nodes) byKind.set(n.kind, [...(byKind.get(n.kind) ?? []), n.label]);
for (const [k, v] of byKind) console.log(`  ${k}: ${v.slice(0, 12).join(', ')}${v.length > 12 ? ` … +${v.length - 12}` : ''}`);

console.log('\nсвязи ExoNodeDom:');
for (const e of model.edges.filter(e => e.from === 'ExoNodeDom').slice(0, 10)) {
    console.log(`  → ${e.to}  [${e.evidence.map(x => x.specifier).join(',')}] ×${e.weight}`);
}
const l = layoutModel(model);
console.log(`\nполотно: ${l.width}×${l.height}`);
