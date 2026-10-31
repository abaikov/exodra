// The names `createExoPropertyWriters` refuses: `class` as a property is an expando and the element is
// unstyled, `style` is a read-only `CSSStyleDeclaration`, and `id`/`slot`/`part` are how the PAGE
// addresses the element. A LIST AND NOT A PROBE: `name in element` cannot be used, because the
// prototype is parsed inside an inert `<template>` so a custom element there is never upgraded, and
// a schema compiles on its first render, routinely before the element's module has run.
export const EXO_GLOBAL_ATTRIBUTES: ReadonlySet<string> = new Set([
    'accesskey',
    'autocapitalize',
    'autofocus',
    'class',
    'contenteditable',
    'dir',
    'draggable',
    'enterkeyhint',
    'exportparts',
    'hidden',
    'id',
    'inert',
    'inputmode',
    'is',
    'itemid',
    'itemprop',
    'itemref',
    'itemscope',
    'itemtype',
    'lang',
    'nonce',
    'part',
    'popover',
    'role',
    'slot',
    'spellcheck',
    'style',
    'tabindex',
    'title',
    'translate',
]);
