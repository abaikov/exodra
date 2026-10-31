// No instance count: a page is ONE instance, and rows that vary are a LIST below its root.
export { renderExoPage } from './page/renderExoPage';
export type { TExoSsrPage } from './types/TExoSsrPage';
export type { TExoSsrPageOptions } from './types/TExoSsrPageOptions';

export { EXO_SSR_RESPONSE } from './constants/EXO_SSR_RESPONSE';
export type { TExoSsrResponse } from './types/TExoSsrResponse';

// For a caller driving the render by hand: the object `renderExoPage` would have built.
export { ExoSsrResponse } from './context/ExoSsrResponse';

// The CLIENT end of the state protocol, in a server package because the protocol is decided here.
export { readExoStateScript } from './scripts/readExoStateScript';

export { renderExoJsonScript, escapeExoJsonForScript } from './scripts/renderExoJsonScript';

export type { TExoSsrHeader } from './types/TExoSsrHeader';
export type { TExoSsrHeadEntry } from './types/TExoSsrHeadEntry';
export type { TExoSsrHeadOption } from './types/TExoSsrHeadOption';
export type { TExoSsrStateScriptOptions } from './types/TExoSsrStateScriptOptions';
export type { TExoSsrDocumentOptions } from './types/TExoSsrDocumentOptions';
