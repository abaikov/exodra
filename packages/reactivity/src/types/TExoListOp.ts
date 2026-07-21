export type TExoListOp<TItem = unknown> =
    | { type: 'insert'; index: number; item: TItem }
    | { type: 'remove'; index: number; count?: number }
    | { type: 'move'; from: number; to: number; count?: number }
    | { type: 'set'; index: number; item: TItem }
    | { type: 'reset'; items: readonly TItem[] };
