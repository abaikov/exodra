import type { TExoLive } from './TExoLive';

/**
 * Every slot present at construction, and `live` written LAST in `makeNodeDom`'s literal so no
 * other field's in-object offset moved. README: "Why a record and not optional fields".
 */
export type TExoInstanceRecord = {
    live: TExoLive | null;
};
