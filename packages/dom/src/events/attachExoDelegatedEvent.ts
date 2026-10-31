import { assertExoSubject } from './asserts/assertExoSubject';
import type { TExoEventAttacher } from './types/TExoEventAttacher';

// ONE function for every delegated pack in the process, because the strategy's whole per-row cost
// is the two stores below and a pack's own names are in the datum rather than in a closure.
export const attachExoDelegatedEvent: TExoEventAttacher = (node, data, handler, subject) => {
    if (subject === undefined) assertExoSubject(data.event);
    const carrier = node as unknown as Record<symbol, unknown>;
    carrier[data.handlerKey] = handler;
    carrier[data.subjectKey] = subject;
};
