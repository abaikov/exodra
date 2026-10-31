import * as t from '@babel/types';

export function isCompilableHost(element: t.JSXElement): boolean {
    const name = element.openingElement.name;
    if (!t.isJSXIdentifier(name) || !/^[a-z][a-z0-9]*$/.test(name.name)) return false;
    for (const attribute of element.openingElement.attributes) {
        if (!t.isJSXAttribute(attribute)) return false;
        if (!t.isJSXIdentifier(attribute.name)) return false;
        if (attribute.name.name === 'children') return false;
    }
    return true;
}
