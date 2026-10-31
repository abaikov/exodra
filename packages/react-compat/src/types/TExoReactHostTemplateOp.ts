import type { TExoAttrPort, TExoTextPort } from '@exodra/core';

export type TExoReactHostTemplateOp =
    | {
          readonly kind: 'attr';
          readonly port: TExoAttrPort;
          readonly value: number;
          readonly stringify: boolean;
      }
    | { readonly kind: 'text'; readonly port: TExoTextPort; readonly value: number }
    | { readonly kind: 'event'; readonly handler: number; readonly value: number }
    | {
          readonly kind: 'part';
          readonly part: number;
          readonly names: readonly string[];
          readonly values: readonly number[];
          readonly ref: number;
      }
    | { readonly kind: 'region'; readonly region: number; readonly value: number };
