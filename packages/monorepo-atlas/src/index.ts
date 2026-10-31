// Build-time: turn a dependency crawl into the artefacts a page needs.
export { buildArtifacts, serialiseData } from './generate/buildArtifacts';
export { collectPackages, classify } from './generate/collectPackages';
export { fileNameFor } from './generate/fileNameFor';

// The model and its geometry.
export { buildModel, filterNodes, withoutExternal } from './model/buildModel';
export { layoutModel } from './layout/layoutModel';
export type * from './model/types';
export type * from './layout/types';
export { extractEntities, EXO_UNRESOLVED_TYPE } from './model/extractEntities';

// THE PICTURE IS NOT HERE ANY MORE. `createExplorer`, `createGraphView`, `createViewState`,
// `mountExplorer` and `mountFromUrl` built and mounted trees for the three-props renderer, which
// has been deleted from `@exodra/core`, `@exodra/dom` and `@exodra/string`. What is left is
// everything that never depended on a renderer: the crawl, the model, the layout, the palette and
// the stylesheet. The README says what a schema-core view would have to bring back.
export { renderGraphCss } from './view/graphCss';

// Colour: the default palette, live checks, and the reader's overrides.
export { colorReport } from './theme/colorReport';
export { renderThemeCss } from './theme/renderThemeCss';
export { applyColors, resolveMode } from './theme/applyPalette';
export type { TExoColors, TExoPaletteOverride } from './theme/applyPalette';
export { defaultPalette, EXO_GRAPH_KINDS } from './theme/palettes';
export type { TExoGraphPalette, TExoGraphMode, TExoGraphKind } from './theme/palettes';
