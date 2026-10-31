/** One event port's whole content, resolved once per event port per (schema, composition) and
 * handed to the pack's `attach` on every fill. Built by `createExoEventPortData` and by nothing
 * else: every pack's data must share ONE hidden class, so all four fields are assigned at one site
 * in one order and a pack with no listener of its own carries `null` rather than omitting the
 * field. */
export type TExoEventPortData = {
    readonly event: string;
    readonly handlerKey: symbol;
    readonly subjectKey: symbol;
    readonly listener: EventListener | null;
};
