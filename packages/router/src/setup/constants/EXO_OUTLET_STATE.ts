import { exoContextToken } from '@exodra/context';
import type { TExoOutletState } from '../../types';

export const EXO_OUTLET_STATE = exoContextToken<TExoOutletState>('exodra.router.outlet');
