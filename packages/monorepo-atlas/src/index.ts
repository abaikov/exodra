// Build-time: turn a dependency crawl into the artefacts a page needs.
export { buildArtifacts, serialiseData } from './generate/buildArtifacts';
export { collectPackages, classify } from './generate/collectPackages';

// The model and its geometry.
export { buildModel, filterNodes, withoutExternal } from './model/buildModel';
export { layoutModel } from './layout/layoutModel';
export type * from './model/types';
export type * from './layout/types';

// Rendering — the same tree on the server and in the browser.
export { createExplorer } from './view/explorer';
export { createGraphView } from './view/graphView';
export { renderGraphCss } from './view/graphCss';
export { createViewState } from './view/viewState';

// Colour: the default palette, live checks, and the reader's overrides.
export { checkColors } from './theme/checkColors';
export { renderThemeCss } from './theme/renderThemeCss';
export { applyColors, resolveMode } from './theme/applyPalette';
export type { TExoColors, TExoPaletteOverride } from './theme/applyPalette';
export { defaultPalette, EXO_GRAPH_KINDS } from './theme/palettes';
export type { TExoGraphPalette, TExoGraphMode, TExoGraphKind } from './theme/palettes';

// Client entry.
export { mountExplorer } from './client/mountExplorer';
export { mountFromUrl, fileNameFor } from './client/mountFromUrl';
export { extractEntities } from './model/extractEntities';
