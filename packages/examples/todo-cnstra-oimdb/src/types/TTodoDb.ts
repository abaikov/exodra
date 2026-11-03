import type { TTodoOimdb } from './TTodoOimdb';

export type TTodoDb = NonNullable<TTodoOimdb['schemas']>['todos'];
