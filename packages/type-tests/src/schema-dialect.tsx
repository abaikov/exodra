import { exoJsx } from '@exodra/jsx';
import { createExoMachine } from '@exodra/core';
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoCursorDeclaration,
    TExoEventPort,
    TExoRefPort,
    TExoTextPort,
} from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';

interface TCounterPorts {
    n: TExoAttrPort;
    count: TExoTextPort;
    increment: TExoEventPort;
    rows: TExoChildrenPort;
    box: TExoRefPort;
    html: TExoChildrenPort;
}

export const COUNTER = exoJsx<TCounterPorts>(($) => (
    <div class="counter" data-n={$.n} ref={$.box}>
        <span>{$.count}</span>
        <button type="button" onClick={$.increment}>
            +
        </button>
        <$.rows />
        <div unsafeHtml={$.html} />
    </div>
));

const _declaration: TExoCursorDeclaration<TCounterPorts> = COUNTER;
const _count: TExoTextPort = COUNTER.ports.count;
createExoMachine<TExoDomNode>(COUNTER);

export const _onColon = exoJsx<{ go: TExoEventPort }>(($) => <button on:dblclick={$.go} />);

export const _svg = exoJsx<{ label: TExoTextPort }>(($) => (
    <svg viewBox="0 0 10 10">
        <defs>
            <linearGradient id="g">
                <stop offset="0" />
            </linearGradient>
            <clipPath id="c" />
            <filter id="f">
                <feDropShadow dx="1" />
                <feGaussianBlur stdDeviation="1" />
            </filter>
        </defs>
        <circle r="1">
            <animateMotion dur="1s">
                <mpath href="#p" />
            </animateMotion>
        </circle>
        <text x="1">
            <tspan>{$.label}</tspan>
        </text>
    </svg>
));

export const _literals = exoJsx(() => (
    <input type="checkbox" tabindex={0} checked disabled={false} />
));

export const _untyped = exoJsx(($) => (
    <li title={$.a} onClick={$.b}>
        <b>{$.c}</b>
        <$.d />
    </li>
));

// A `@ts-expect-error` suppresses the line that FOLLOWS it, stepping over blank and `//` lines and
// nothing else, so the directives that aim at an attribute sit inside the JSX.

export const _textAsEvent = exoJsx<TCounterPorts>(($) => (
    // @ts-expect-error a text port is not an event port
    <button onClick={$.count} />
));

export const _eventAsText = exoJsx<TCounterPorts>(($) => (
    <b>
        {/* @ts-expect-error an event port is not text */}
        {$.increment}
    </b>
));

export const _attrAsTag = exoJsx<TCounterPorts>(($) => (
    <ul>
        {/* @ts-expect-error an attribute port is not a children port */}
        <$.n />
    </ul>
));

export const _missingPort = exoJsx<TCounterPorts>(($) => (
    // @ts-expect-error there is no port called "nope"
    <li title={$.nope} />
));

export const _closure = exoJsx<TCounterPorts>(() => (
    // @ts-expect-error an event attribute takes a port, not a closure
    <button onClick={() => undefined} />
));

// @ts-expect-error an inline HTML handler is a string of script
export const _inlineHandler = exoJsx(() => <button onclick="alert(1)" />);

export const _childrenOnPort = exoJsx<TCounterPorts>(($) => (
    <ul>
        {/* @ts-expect-error a children port has no children */}
        <$.rows>x</$.rows>
    </ul>
));

export const _unsafeLiteral = exoJsx(() => (
    // @ts-expect-error unsafeHtml takes a children port
    <div unsafeHtml="<b>x</b>" />
));

// @ts-expect-error there is no "clik" event
export const _typoEvent = exoJsx<TCounterPorts>(($) => <button on:clik={$.increment} />);
