import { EXO_REACT_HOST_ADOPTION } from './constants/EXO_REACT_HOST_ADOPTION';
import { EXO_REACT_HOST_TEMPLATES } from './constants/EXO_REACT_HOST_TEMPLATES';
import { adoptExoReactHostSlot } from './render/adoptExoReactHostSlot';
import { readExoReactTemplatedElement } from './render/readExoReactTemplatedElement';

export function enableExoReactHostTemplates(enabled = true): void {
    EXO_REACT_HOST_TEMPLATES.readTemplatedElement = enabled ? readExoReactTemplatedElement : null;
    if (enabled) EXO_REACT_HOST_ADOPTION.adopt = adoptExoReactHostSlot;
}
