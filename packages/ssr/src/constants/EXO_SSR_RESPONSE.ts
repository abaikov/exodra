import { exoContextToken } from '@exodra/context';
import type { TExoSsrResponse } from '../types/TExoSsrResponse';

// The token a page reads the request through: `c.inject(EXO_SSR_RESPONSE)!` in any wiring function.
// `renderExoPage` provides it before the first instance is wired and takes it back down after, so
// it is in force for one request. Outside it this injects `undefined` — no request to talk to.
export const EXO_SSR_RESPONSE = exoContextToken<TExoSsrResponse>('exodra.ssr');
