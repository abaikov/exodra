import { exoSketchOfChildren } from './exoSketchOfElement';

// A `<template>`'s `innerHTML` and not a `<div>`'s, matching how `@exodra/dom` parses its own
// prototype. Template contents are parsed in their own insertion mode, so a fragment starting with
// `<li>`, `<option>` or `<tr>` survives instead of being foster-parented or dropped. Using the same
// parser on both sides of a server/client rule is also what stops a reported divergence from being
// an artefact of two different parsings — `exoHydrateAdapter` is held to it at the other end.
export function exoSketchOfMarkup(markup: string, probe: readonly string[]): string {
    const holder = document.createElement('template');
    holder.innerHTML = markup;
    return exoSketchOfChildren(holder.content, probe);
}
