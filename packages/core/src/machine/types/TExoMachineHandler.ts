import type { TExoEventPort } from '../../schema/ports/types/TExoEventPort';
import type { TExoEventHandler } from '../../wiring/types/TExoEventHandler';

export type TExoMachineHandler = {
    readonly port: TExoEventPort;
    readonly run: TExoEventHandler;
};
