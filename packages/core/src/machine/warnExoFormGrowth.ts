import type { TExoMachine } from './types/TExoMachine';

const EXO_FORM_LIMIT = 8;

let exoFormWarned: WeakSet<object> | null = null;

export function warnExoFormGrowth(machine: TExoMachine<never>): void {
    if (!(typeof process !== 'undefined' && process.env.NODE_ENV !== 'production')) return;
    let held = 0;
    for (const _at in machine.forms) held++;
    if (held < EXO_FORM_LIMIT) return;
    const warned = (exoFormWarned ??= new WeakSet<object>());
    if (warned.has(machine)) return;
    warned.add(machine);
    console.warn(
        `exodra(schema cache): the <${machine.declaration.rootTag}> machine already holds ${held} ` +
            'compiled schemas on machine.forms and is compiling another, and nothing ever removes ' +
            'one. There is one per distinct BACKEND the machine has been rendered under: each ' +
            'backend object takes its own backendType when it is constructed. Each schema holds a ' +
            'parsed prototype element, a setter table and the backend itself. This is what writing ' +
            'withSomething(new ExoDomBackend()) inside a render, a route handler or a component ' +
            'factory looks like from here: rendering through the same backend costs nothing, but ' +
            'a backend BUILT per call is a new backendType, and a new backendType is a new schema ' +
            'and a re-parse of this declaration. Build the backend ONCE, at module level, and ' +
            'render from that. (Development-only message; said once per machine.)'
    );
}
