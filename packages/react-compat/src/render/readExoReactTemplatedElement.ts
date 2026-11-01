import { EXO_REACT_HOST_TEMPLATES } from '../constants/EXO_REACT_HOST_TEMPLATES';
import { collectExoReactHostTemplateValues } from './collectExoReactHostTemplateValues';
import { compileExoReactHostTemplate } from './compileExoReactHostTemplate';
import { isExoReactTemplateHost } from './isExoReactTemplateHost';
import type { TExoReactElement } from '../types/TExoReactElement';
import type { TExoReactHostTemplate } from '../types/TExoReactHostTemplate';

function hasHostChild(children: unknown): boolean {
    if (!Array.isArray(children)) return isExoReactTemplateHost(children);
    for (let i = 0; i < children.length; i++) {
        if (isExoReactTemplateHost(children[i])) return true;
    }
    return false;
}

function templatedOf(
    template: TExoReactHostTemplate,
    element: TExoReactElement,
    values: readonly unknown[]
): TExoReactElement {
    return {
        $$typeof: element.$$typeof,
        type: element.type,
        props: element.props,
        key: element.key,
        ref: element.ref,
        host: template.machine,
        values,
        source: element,
    } as TExoReactElement;
}

export function readExoReactTemplatedElement(
    component: object,
    element: TExoReactElement
): TExoReactElement | null {
    const cacheSymbol = EXO_REACT_HOST_TEMPLATES.cacheSymbol;
    const owner = component as { [key: symbol]: TExoReactHostTemplate[] | undefined };
    let templates = owner[cacheSymbol];
    let hint = -1;
    if (templates !== undefined) {
        for (let i = 0; i < templates.length; i++) {
            const template = templates[i];
            if (template.node.tag !== element.type) continue;
            const values: unknown[] = [];
            if (collectExoReactHostTemplateValues(template.node, element, values)) {
                return templatedOf(template, element, values);
            }
            hint = i;
        }
        if (hint < 0 && templates.length >= EXO_REACT_HOST_TEMPLATES.perComponent) return null;
    }
    if (!hasHostChild(element.props.children) || !isExoReactTemplateHost(element)) return null;
    const template = compileExoReactHostTemplate(
        element,
        hint < 0 ? null : (templates as TExoReactHostTemplate[])[hint].node
    );
    if (template === null) return null;
    if (templates === undefined) {
        if (!Object.isExtensible(component)) return null;
        templates = owner[cacheSymbol] = [];
    }
    if (hint < 0) templates.push(template);
    else templates[hint] = template;
    const values: unknown[] = [];
    if (!collectExoReactHostTemplateValues(template.node, element, values)) return null;
    return templatedOf(template, element, values);
}
