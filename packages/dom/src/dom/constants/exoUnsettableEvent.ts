import type { TExoDomSetter } from '../types/TExoDomSetter';

/**
 * What an event port's setter slot holds — a refusal, because the slot cannot be left empty and
 * `on` does not read this table at all: it calls the composition's `attach` with the port's datum.
 * So anything arriving here came through a value door, which no pack can serve.
 *
 * Prose-stripped, check kept: the refusal ships, the explanation does not.
 */
export const exoUnsettableEvent: TExoDomSetter = (node) => {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `createExoSchema(dom): the event port on <${node.tagName.toLowerCase()}> cannot be ` +
              'filled with attr(), text(), html() or a port writer — a handler is not a value ' +
              'and an event port has no ' +
              'writer. Use c.on(port, handler, subject), which reaches the events pack this ' +
              'composition chose; a handler stored as an attribute or as text would print the ' +
              'source of the function and never fire. In TypeScript this call does not compile, ' +
              'so reaching it means the port arrived from untyped code.'
            : 'EXO0090'
    );
};
