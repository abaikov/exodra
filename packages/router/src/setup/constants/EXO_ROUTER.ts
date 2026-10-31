import { exoContextToken } from '@exodra/context';
import type { TExoRouter } from '../../types';

// ONE token for the process: two would be two identities and the outlet would find nothing. What
// travels is the ROUTER, never the match, so a non-reactive context can carry it.
export const EXO_ROUTER = exoContextToken<TExoRouter>('exodra.router');
