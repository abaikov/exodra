import type { TTodoDb } from './TTodoDb';

export type TTodoBucket = ReturnType<TTodoDb['todosInOrder']['getSlotByKey']>;
