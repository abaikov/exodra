// Deliberately open, so an application can put a key code or a column on it.
export type TExoTermEvent = {
    readonly type: string;
    readonly [key: string]: unknown;
};
