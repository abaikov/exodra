/** How one port's value reaches the DOM: one per port per schema, fixed when it compiled. The
 * first parameter stays `Element` although a `takesTextNode` writer is handed a Text node — that one
 * writer casts. The THIRD parameter is whatever this port's writer needs and nothing else: for an
 * attribute or a property it is `schema.writeData[index]` — the markup name, the property key or a
 * namespace triple — so one shared body serves every port of its kind in the process; for an event
 * port it is `subject`, against which a handler naming a property resolves. */
export type TExoDomSetter = {
    (node: Element, value: unknown, data?: unknown): void;
    /** On the FUNCTION, so a pack that delegates `text` forwards it by forwarding the function. */
    takesTextNode?: true;
};
