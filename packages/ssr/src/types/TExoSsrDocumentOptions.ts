import type { TExoSsrHeadOption } from './TExoSsrHeadOption';

export type TExoSsrDocumentOptions = {
    doctype?: string | false;
    lang?: string;
    rootId?: string;
    nonce?: string;
    head?: TExoSsrHeadOption;
    htmlAttributes?: Record<string, unknown>;
    bodyAttributes?: Record<string, unknown>;
};
