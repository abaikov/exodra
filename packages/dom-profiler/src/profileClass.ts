import { profileMethods } from './profileMethods';

export interface TExoProfileSample {
    className: string;
    method: string;
    durationMs: number;
}
export type TExoProfileCallback = (sample: TExoProfileSample) => void;

export interface TExoProfileOptions {
    methods?: readonly string[];
    excludeMethods?: readonly string[];
}

type ProfilableClass = new (...args: never[]) => object;

export function profileClass<T extends ProfilableClass>(
    ClassToProfile: T,
    callback: TExoProfileCallback,
    options: TExoProfileOptions = {}
): () => void {
    return profileMethods(
        ClassToProfile.prototype as object,
        ClassToProfile.name,
        callback,
        options
    );
}
