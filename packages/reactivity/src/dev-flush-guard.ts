// Dev-only re-entrancy guard for the reactive graph.
//
// Exodra propagates a write synchronously: setValue() and the list ops notify
// every subscriber inline — that notification loop is the "flush". A subscriber
// (a view recompute, a derived map, an effect) is expected to only READ the
// graph while it runs. If it WRITES back — sets another bindable, mutates a list
// — that write lands mid-flush: the still-pending subscribers of the outer write
// observe half-applied state, and a cycle loops until the stack blows. The
// symptom (often surfacing at the oimdb x view-subscription seam) is baffling
// unless you already know the rule "recompute only reads".
//
// This guard makes that rule observable: in dev it warns (once per source->target
// site) when a reactive write starts while a flush is in flight. In production
// `__DEV__` folds to false and every call site behind `if (__DEV__)` is dropped
// by the consumer's bundler, so there is zero runtime cost on the hot path.

export const __DEV__ = process.env.NODE_ENV !== 'production';

// Stack of the sources currently flushing (labels like `bindable.setValue`).
// A stack, not a counter, so the warning can name the outermost write in flight.
const flushStack: string[] = [];

// Dedupe by "source -> target" so a write inside a loop warns once, not N times.
const warned = new Set<string>();

// Mark the start of a notification loop. Pair with endFlush() in a finally.
export function beginFlush(source: string): void {
    flushStack.push(source);
}

export function endFlush(): void {
    flushStack.pop();
}

// Call at the top of every reactive write. Warns if a flush is in progress.
export function warnWriteDuringFlush(target: string): void {
    if (flushStack.length === 0) return;
    const source = flushStack[flushStack.length - 1];
    const key = `${source} -> ${target}`;
    if (warned.has(key)) return;
    warned.add(key);
    // eslint-disable-next-line no-console
    console.error(
        `[exodra] reactive write to "${target}" while "${source}" was ` +
            `notifying its subscribers. A subscriber (recompute / derived map / ` +
            `effect) must only READ the reactive graph — writing mid-flush makes ` +
            `the other subscribers of "${source}" see half-applied state and can ` +
            `loop. Move the write out of the subscription: defer it, or restructure ` +
            `so the recompute is read-only.`
    );
}

// Test-only: clear the flush stack and the dedupe set between cases.
export function __resetFlushGuard(): void {
    flushStack.length = 0;
    warned.clear();
}
