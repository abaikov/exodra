import { EXO_CAP_ELEMENT } from './EXO_CAP_ELEMENT';
import { EXO_CAP_LIVE_TREE } from './EXO_CAP_LIVE_TREE';
import { EXO_CAP_TEXT_NODE } from './EXO_CAP_TEXT_NODE';
import { EXO_CAP_UPDATE } from './EXO_CAP_UPDATE';

// Every capability, for the completeness check and for readable failure messages.
export const EXO_CONFORMANCE_CAPABILITIES = [
    EXO_CAP_ELEMENT,
    EXO_CAP_UPDATE,
    EXO_CAP_LIVE_TREE,
    EXO_CAP_TEXT_NODE,
] as const;
