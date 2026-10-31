import type { TExoAnyPort } from './TExoAnyPort';

// The keys of the declared port interface, narrowed to those whose declared type accepts the kind
// of port THIS CALL mints — so `card.port('data-i', 'index')` compiles where `'title'` does not.
// The test is `TPort extends TPorts[K]`, in the direction the record is BUILT: the produced port
// must fit the declared holder. Reversed, it would let a narrow holder accept the wrong kind, the
// five port types differing in the `kind` field alone. `unknown` accepts every string, so naming
// stays usable from JavaScript and from a compiler emitting cursor calls. `& string` because
// `keyof` also yields `number | symbol`. README, "Naming ports".
export type TExoPortName<TPorts, TPort extends TExoAnyPort> = unknown extends TPorts
    ? string
    : {
          [K in keyof TPorts]-?: TPort extends TPorts[K] ? K : never;
      }[keyof TPorts] &
          string;
