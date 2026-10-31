import type { TExoDomSetter } from '../types/TExoDomSetter';

/**
 * What a ref port's setter slot holds — a refusal, because the slot cannot be left empty. The type
 * is the defence and this is not it: nothing that type-checks can reach here, only untyped code.
 * Not an empty slot, because the table is typed `TExoDomSetter[]` and a hole means a guard on
 * `this.setters[index](…)`, the hottest line in this package.
 *
 * Prose-stripped, check kept: the refusal ships, the explanation does not.
 */
export const exoUnsettableRef: TExoDomSetter = (node) => {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `createExoSchema(dom): the ref port on <${node.tagName.toLowerCase()}> cannot be ` +
              'filled with attr(), text(), html() or a port writer' +
              ' — a ref port has no writer at all. It exists ONLY so that a wire can ' +
              'obtain the element (to observe it, focus it or measure it), and that is what ' +
              'c.portNodeReader()(c.portTable(), port) hands back. In TypeScript ' +
              'this call does not compile; reaching it means the port arrived from untyped ' +
              'code. If the element needs a VALUE written to it, declare port(name), textPort() ' +
              'or eventPort(name) beside this one — an element may carry as many ports as it likes.'
            : 'EXO0049'
    );
};
