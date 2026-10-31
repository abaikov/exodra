import type { TExoDomSchemaBase } from './TExoDomSchemaBase';

/** The pair of record factories a surface owns. Two objects carry it: a composed backend, built
 * over itself, and the adopting surface `withExoHydration` makes, built over that. */
export type TExoDomRecordFactories = {
    readonly createInstance: TExoDomSchemaBase['createInstance'];
    readonly createChild: TExoDomSchemaBase['createChild'];
};
