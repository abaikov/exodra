export function composeExoMachine<A>(base: A): A;
export function composeExoMachine<A, B>(base: A, ab: (a: A) => B): B;
export function composeExoMachine<A, B, C>(base: A, ab: (a: A) => B, bc: (b: B) => C): C;
export function composeExoMachine<A, B, C, D>(
    base: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D
): D;
export function composeExoMachine<A, B, C, D, E>(
    base: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E
): E;
export function composeExoMachine<A, B, C, D, E, F>(
    base: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F
): F;
export function composeExoMachine<A, B, C, D, E, F, G>(
    base: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G
): G;
export function composeExoMachine(
    base: unknown,
    ...steps: ((machine: unknown) => unknown)[]
): unknown {
    let machine = base;
    for (let i = 0; i < steps.length; i++) machine = steps[i](machine);
    return machine;
}
