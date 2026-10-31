import type { TExoPort } from './TExoPort';
import type { TExoRefPort } from './TExoRefPort';

/** THE PAIR READS BACKWARDS: `TExoPort` is the WRITABLE SUBSET, not "a port". */
export type TExoAnyPort = TExoPort | TExoRefPort;
