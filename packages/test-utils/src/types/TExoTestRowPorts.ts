import type { TExoAttrPort, TExoTextPort, TExoEventPort } from '@exodra/core';

export type TExoTestRowPorts = {
    id: TExoAttrPort;
    label: TExoTextPort;
    mark: TExoAttrPort;
    // An EVENT port: it takes a slot while emitting no markup, so it is the one that catches a
    // backend numbering its ports differently from its counterpart's.
    click: TExoEventPort;
    count: TExoTextPort;
};
