// Refused when the port is FILLED, not when the user clicks: left to dispatch, a forgotten third
// argument surfaces as a button that throws in production, days later, far from the wire.
// A function so the happy path keeps one compare — the attach bodies test inline and call this on
// the way to throwing, so the message and its allocation stay off the per-row path.
export function assertExoSubject(event: string): never {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `exoEvents: the "${event}" port was filled without a subject under the delegated ` +
              "strategy — on(port, handler, subject), where the subject is usually the row's item." +
              ' The subject is the whole of what a handler is told about the position it fired ' +
              'on, which is what lets ONE module-level function serve every row; a handler that ' +
              'carried its own row would be a closure, and a closure per row is the cost ' +
              'delegation removes.'
            : `EXO0050 "${event}"`
    );
}
