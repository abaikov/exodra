import type * as t from '@babel/types';
import type { TExoReactNames } from './TExoReactNames';

export type TExoHostTreeWalk = {
    readonly names: TExoReactNames;
    readonly helpers: {
        readonly reconcileRegion: string;
        readonly jsx: string;
        readonly writeProps: string;
    };
    readonly slots: string[];
    readonly ports: string[];
    readonly values: t.Expression[];
    readonly fills: t.Statement[];
    readonly regions: string[];
    readonly events: string[];
    readonly parts: string[];
    nextPort: number;
};
