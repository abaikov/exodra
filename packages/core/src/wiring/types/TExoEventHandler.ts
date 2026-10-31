export type TExoEventHandler<TEvent = unknown, TNode = unknown> = (
    this: TNode,
    event: TEvent,
    subject?: unknown
) => void;
