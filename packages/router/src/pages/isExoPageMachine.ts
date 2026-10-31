import type { TExoPageMachine, TExoRouteMachine } from '../types';

// The other member of the union is a LOADER, which is a function, so these two fields are the whole
// test. Asked per SWAP, never per render. It also catches an object that is not a machine at all,
// which is what turns "the page is blank" into the named error in `showExoOutletRoute`.
export function isExoPageMachine(machine: TExoRouteMachine): machine is TExoPageMachine {
    return (
        typeof machine === 'object' &&
        machine !== null &&
        'declaration' in machine &&
        'handlers' in machine
    );
}
