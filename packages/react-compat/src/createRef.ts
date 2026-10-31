export function createRef<TValue>(): { current: TValue | null } {
    return { current: null };
}
