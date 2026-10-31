import type { TExoChildrenPort, TExoEventPort, TExoRefPort, TExoTextPort } from '@exodra/core';
import type {
    TExoJsxAnyPort,
    TExoJsxAttrPort,
    TExoJsxChildrenPort,
    TExoJsxEventPort,
    TExoJsxRefPort,
    TExoJsxTextPort,
} from './jsx-runtime';

type TExoJsxPortOf<TPort> = TPort extends TExoChildrenPort
    ? TExoJsxChildrenPort
    : TPort extends TExoTextPort
    ? TExoJsxTextPort
    : TPort extends TExoEventPort
    ? TExoJsxEventPort
    : TPort extends TExoRefPort
    ? TExoJsxRefPort
    : TExoJsxAttrPort;

export type TExoJsxPorts<TPorts> = unknown extends TPorts
    ? Readonly<Record<string, TExoJsxAnyPort>>
    : { readonly [K in keyof TPorts]-?: TExoJsxPortOf<TPorts[K]> };
