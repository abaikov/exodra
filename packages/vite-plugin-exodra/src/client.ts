// The `./client` subpath: the transform on its own, for a build script or test
// transformer that wants it without the Vite plugin. A tsup entry, so it stays a file.
export { transformExodraJsx } from './transformExodraJsx';
export type { TExoTransformResult, TExoTransformSettings } from './transformExodraJsx';
