// @vitest-environment jsdom
//
// `dom`, `hydrate` and `string` must agree that an SVG attribute lands under the PARSER's name. The
// server agreeing looks wrong and is not: its lowercase `viewbox` comes back out of "adjust SVG
// attributes" as `viewBox`, and the DOM backend's own markup is lowercase too. What diverges is a
// backend that never parsed the name — `setAttribute` in the SVG namespace neither lowercases nor
// adjusts, so the name lands as itself, a second dead attribute beside the real one.
//
// Each case is asked TWICE because a compiler reserves a markup position for every attribute port
// EXCEPT the last one that emits markup: a port declared LAST produces ONE wrongly spelled
// attribute, one declared earlier produces TWO. A single order pins half a bug. `term` is excused
// by DERIVATION from the `<svg>`, which is what makes the artefact carry a namespace its flat
// attribute record has nowhere to put; use a `<div>` and it gets asked.
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenWiring,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, it } from 'vitest';
import { EXO_CAP_ELEMENT, cannotExpress, assertExoConformanceRule, renders } from '../../index';
import { createExoTestMachine } from '@exodra/test-utils';

// The only markup port, so it is the LAST one and no markup position is reserved for it.
const svgWithPort = (portName: string, value: string) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let attr!: TExoAttrPort;
            b.el('svg', null, (svg) => {
                attr = svg.port(portName);
            });
            return { attr };
        },
        (P): TExoMachineInitialState<TExoChildrenWiring> =>
            (c) => {
                c.attr(P.attr, value);
            }
    );

// A second markup port behind the first, so the port under test is no longer last and the parser
// creates its attribute before any fill runs. `data-probe` is lowercase, in no adjustment table and
// null-namespaced in SVG as in HTML, so it contributes nothing else.
const svgWithPortThenAnother = (portName: string, value: string) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let attr!: TExoAttrPort;
            let probe!: TExoAttrPort;
            b.el('svg', null, (svg) => {
                attr = svg.port(portName);
                probe = svg.port('data-probe');
            });
            return { attr, probe };
        },
        (P): TExoMachineInitialState<TExoChildrenWiring> =>
            (c) => {
                c.attr(P.attr, value);
                c.attr(P.probe, 'behind');
            }
    );

const SVG_ATTRIBUTES = [
    { portName: 'viewBox', value: '0 0 10 10' },
    // "Adjust foreign attributes" turns the parsed `xlink:href` into an XLINK-namespaced
    // `href`, so the setter must use `setAttributeNS` with the prototype `Attr`'s namespace.
    { portName: 'xlink:href', value: '#target' },
    // On an element in the SVG namespace `className` is a read-only `SVGAnimatedString`: a setter
    // routing `class` through the property raises a `TypeError` where it is implemented and writes
    // a silent expando where it is not, and neither leaves the element carrying a `class`.
    { portName: 'class', value: 'chart' },
] as const;

const PORT_ORDERS = [
    { where: 'on an <svg>', build: svgWithPort },
    { where: 'on an <svg> with a port declared behind it', build: svgWithPortThenAnother },
] as const;

describe('an SVG attribute whose real name is not its lowercase spelling', () => {
    for (const attribute of SVG_ATTRIBUTES) {
        for (const order of PORT_ORDERS) {
            const name = `port("${attribute.portName}") ${order.where}`;
            it(`${name} lands under the parser’s name on every backend that can express it`, () => {
                assertExoConformanceRule({
                    name,
                    subject: () => ({
                        component: order.build(attribute.portName, attribute.value),
                    }),
                    expect: {
                        dom: renders(),
                        string: renders(),
                        term: cannotExpress(EXO_CAP_ELEMENT),
                        hydrate: renders(),
                    },
                    agreement: [['dom', 'hydrate', 'string']],
                });
            });
        }
    }
});
