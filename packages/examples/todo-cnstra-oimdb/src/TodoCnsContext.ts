import { exoContextToken } from '@exodra/context';
import type { TTodoCns } from './types/TTodoCns';

export const TodoCnsContext = exoContextToken<TTodoCns>('todo cns');
