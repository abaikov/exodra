import type { TExoMountOptions } from './TExoMountOptions';
import type { TExoMountSource } from './TExoMountSource';

export type TExoMountProps<TParams = unknown> = TExoMountOptions<TParams> & {
    component: TExoMountSource<TParams>;
    html?: string;
    className?: string;
    id?: string;
    style?: Record<string, string | number>;
};
