import type { TExoAnyPort } from '@exodra/core';
import type { TExoTermWriter } from './TExoTermWriter';

export type TExoTermWriterFactory = (name: string | null) => TExoTermWriter;

export type TExoTermWriterFactories = Readonly<Record<TExoAnyPort['kind'], TExoTermWriterFactory>>;
