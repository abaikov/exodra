import { exoContextFrame } from '@exodra/context';
import type { TExoContextFrame, TExoContextToken } from '@exodra/context';

// `below` is what the providing instance INHERITED, so the frame returned is the ENTIRE context in
// force there rather than one layer of it. One chain link per `provide`, nothing per inject. Why
// there is deliberately no second, implicit channel: ../../README.md § Contexts.
export function provideExoContext<TValue>(
    below: TExoContextFrame | null,
    key: TExoContextToken<TValue>,
    value: TValue
): TExoContextFrame {
    return exoContextFrame(below, key, value);
}
