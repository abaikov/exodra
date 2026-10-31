import { EXO_REACT_HOST_TEMPLATES } from './constants/EXO_REACT_HOST_TEMPLATES';
import { readExoReactTemplatedElement } from './render/readExoReactTemplatedElement';

export function enableExoReactHostTemplates(enabled = true): void {
    EXO_REACT_HOST_TEMPLATES.readTemplatedElement = enabled ? readExoReactTemplatedElement : null;
}
