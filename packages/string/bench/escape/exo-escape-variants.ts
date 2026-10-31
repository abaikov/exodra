import { escapeExoAttributeValue } from '../../../core/src/escape/escapeExoAttributeValue';
import { escapeExoText } from '../../../core/src/escape/escapeExoText';
import type { TExoBenchCandidate } from '../types/TExoBenchCandidate';
import type { TExoBenchVariant } from '@exodra/bench-harness';

// IMPORTED FROM `packages/core/src`, NOT FROM `@exodra/core`: that specifier resolves to core's
// `dist`, and a bench that reads a bundle measures whatever was last built.
//
// U+00A0 IS WRITTEN `\u00A0` EVERYWHERE HERE. It is one of the four characters these functions act
// on and it is indistinguishable from a space in an editor and in a diff.
//
// EVERY VARIANT CARRIES ITS OWN LOOP, and every loop reads a character out of the result. `+=`
// hands back a cons string, so a run that never touched the result would charge the scanning rows
// nothing for a flatten that `replace` pays eagerly — the rig `packages/benchmarks/README.md`
// names. `charCodeAt` forces V8 to flatten; that is an assumption about the engine, stated here
// because it is not something this file measures.

const CHAR_AMP = 38;
const CHAR_QUOTE = 34;
const CHAR_LT = 60;
const CHAR_GT = 62;
const CHAR_NBSP = 160;

function readOut(out: string): number {
    return out.length === 0 ? 0 : out.charCodeAt(0);
}

function escapeTextTwin(value: string): string {
    if (!/[&<>\u00A0]/.test(value)) return value;
    return value
        .replace(/&/g, '&amp;')
        .replace(/\u00A0/g, '&nbsp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// The shipped chain WITHOUT its guard, which is the only difference: it prices the guard.
function escapeTextNoTest(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/\u00A0/g, '&nbsp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function textEntity(match: string): string {
    switch (match) {
        case '&':
            return '&amp;';
        case '<':
            return '&lt;';
        case '>':
            return '&gt;';
        default:
            return '&nbsp;';
    }
}

// ONE pass over the string instead of four, at the price of a call per hit.
function escapeTextReplaceFn(value: string): string {
    return value.replace(/[&<>\u00A0]/g, textEntity);
}

function escapeTextReplaceAll(value: string): string {
    if (!/[&<>\u00A0]/.test(value)) return value;
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('\u00A0', '&nbsp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

// No regex engine at all: one code-unit scan, slices flushed between hits. The clean case returns
// the ARGUMENT, so it allocates nothing where the shipped guard also allocates nothing.
function escapeTextScan(value: string): string {
    let out = '';
    let from = 0;
    for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        let entity: string;
        if (code === CHAR_AMP) entity = '&amp;';
        else if (code === CHAR_LT) entity = '&lt;';
        else if (code === CHAR_GT) entity = '&gt;';
        else if (code === CHAR_NBSP) entity = '&nbsp;';
        else continue;
        if (from !== i) out += value.slice(from, i);
        out += entity;
        from = i + 1;
    }
    if (from === 0) return value;
    if (from !== value.length) out += value.slice(from);
    return out;
}

/**
 * THE BOUND, AND NOT A FLOOR ON EVERY INPUT. On an input with nothing to escape it IS the native
 * floor: the shipped escaper hands back its argument, so the two outputs are identical and the gap
 * between them is exactly what the guard costs. On an input that needs escaping it produces
 * DIFFERENT BYTES — an injection, not a faster renderer — and the table marks it `‡` and refuses to
 * rank it.
 */
function escapePass(value: string): string {
    return value;
}

function driveTextShipped(stream: readonly string[]): number {
    let acc = 0;
    for (let i = 0; i < stream.length; i++) acc += readOut(escapeExoText(stream[i]));
    return acc;
}

function driveTextTwin(stream: readonly string[]): number {
    let acc = 0;
    for (let i = 0; i < stream.length; i++) acc += readOut(escapeTextTwin(stream[i]));
    return acc;
}

function driveTextNoTest(stream: readonly string[]): number {
    let acc = 0;
    for (let i = 0; i < stream.length; i++) acc += readOut(escapeTextNoTest(stream[i]));
    return acc;
}

function driveTextReplaceFn(stream: readonly string[]): number {
    let acc = 0;
    for (let i = 0; i < stream.length; i++) acc += readOut(escapeTextReplaceFn(stream[i]));
    return acc;
}

function driveTextReplaceAll(stream: readonly string[]): number {
    let acc = 0;
    for (let i = 0; i < stream.length; i++) acc += readOut(escapeTextReplaceAll(stream[i]));
    return acc;
}

function driveTextScan(stream: readonly string[]): number {
    let acc = 0;
    for (let i = 0; i < stream.length; i++) acc += readOut(escapeTextScan(stream[i]));
    return acc;
}

function driveTextPass(stream: readonly string[]): number {
    let acc = 0;
    for (let i = 0; i < stream.length; i++) acc += readOut(escapePass(stream[i]));
    return acc;
}

export const EXO_ESCAPE_TEXT_VARIANTS: readonly TExoBenchVariant<readonly string[]>[] = [
    { name: 'shipped', drive: driveTextShipped },
    { name: 'shipped·twin', drive: driveTextTwin },
    { name: 'no·test', drive: driveTextNoTest },
    { name: 'replace·fn', drive: driveTextReplaceFn },
    { name: 'replaceAll', drive: driveTextReplaceAll },
    { name: 'scan·slice', drive: driveTextScan },
    { name: 'pass', drive: driveTextPass },
];

/** `pass` is absent on purpose: the gate is exactly the list of rows that must agree. */
export const EXO_ESCAPE_TEXT_CANDIDATES: readonly TExoBenchCandidate[] = [
    { name: 'shipped', answer: escapeExoText },
    { name: 'shipped·twin', answer: escapeTextTwin },
    { name: 'no·test', answer: escapeTextNoTest },
    { name: 'replace·fn', answer: escapeTextReplaceFn },
    { name: 'replaceAll', answer: escapeTextReplaceAll },
    { name: 'scan·slice', answer: escapeTextScan },
];

function escapeAttrTwin(value: string): string {
    if (!/[&"<>\u00A0]/.test(value)) return value;
    return value
        .replace(/&/g, '&amp;')
        .replace(/\u00A0/g, '&nbsp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function attrEntity(match: string): string {
    switch (match) {
        case '&':
            return '&amp;';
        case '"':
            return '&quot;';
        case '<':
            return '&lt;';
        case '>':
            return '&gt;';
        default:
            return '&nbsp;';
    }
}

function escapeAttrReplaceFn(value: string): string {
    return value.replace(/[&"<>\u00A0]/g, attrEntity);
}

function escapeAttrScan(value: string): string {
    let out = '';
    let from = 0;
    for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        let entity: string;
        if (code === CHAR_AMP) entity = '&amp;';
        else if (code === CHAR_QUOTE) entity = '&quot;';
        else if (code === CHAR_LT) entity = '&lt;';
        else if (code === CHAR_GT) entity = '&gt;';
        else if (code === CHAR_NBSP) entity = '&nbsp;';
        else continue;
        if (from !== i) out += value.slice(from, i);
        out += entity;
        from = i + 1;
    }
    if (from === 0) return value;
    if (from !== value.length) out += value.slice(from);
    return out;
}

function driveAttrShipped(stream: readonly string[]): number {
    let acc = 0;
    for (let i = 0; i < stream.length; i++) acc += readOut(escapeExoAttributeValue(stream[i]));
    return acc;
}

function driveAttrTwin(stream: readonly string[]): number {
    let acc = 0;
    for (let i = 0; i < stream.length; i++) acc += readOut(escapeAttrTwin(stream[i]));
    return acc;
}

function driveAttrReplaceFn(stream: readonly string[]): number {
    let acc = 0;
    for (let i = 0; i < stream.length; i++) acc += readOut(escapeAttrReplaceFn(stream[i]));
    return acc;
}

function driveAttrScan(stream: readonly string[]): number {
    let acc = 0;
    for (let i = 0; i < stream.length; i++) acc += readOut(escapeAttrScan(stream[i]));
    return acc;
}

function driveAttrPass(stream: readonly string[]): number {
    let acc = 0;
    for (let i = 0; i < stream.length; i++) acc += readOut(escapePass(stream[i]));
    return acc;
}

/**
 * A CONFIRMATION TABLE AND NOT A SECOND INVESTIGATION. The attribute escaper is the text escaper
 * with one more character and one more replacement, so the design question is settled by the table
 * above; what this one has to answer is whether the extra pass moves the ranking.
 */
export const EXO_ESCAPE_ATTR_VARIANTS: readonly TExoBenchVariant<readonly string[]>[] = [
    { name: 'shipped', drive: driveAttrShipped },
    { name: 'shipped·twin', drive: driveAttrTwin },
    { name: 'replace·fn', drive: driveAttrReplaceFn },
    { name: 'scan·slice', drive: driveAttrScan },
    { name: 'pass', drive: driveAttrPass },
];

export const EXO_ESCAPE_ATTR_CANDIDATES: readonly TExoBenchCandidate[] = [
    { name: 'shipped', answer: escapeExoAttributeValue },
    { name: 'shipped·twin', answer: escapeAttrTwin },
    { name: 'replace·fn', answer: escapeAttrReplaceFn },
    { name: 'scan·slice', answer: escapeAttrScan },
];
