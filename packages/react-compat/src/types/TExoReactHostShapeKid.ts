import type { TExoReactHostShape } from './TExoReactHostShape';

export type TExoReactHostShapeKid =
    | { readonly kind: 'host'; readonly shape: TExoReactHostShape }
    | {
          readonly kind: 'text';
          readonly value: number;
          readonly text: string;
          readonly width: number;
      }
    | {
          readonly kind: 'region';
          readonly value: number;
          readonly width: number;
          readonly whole: boolean;
      };
