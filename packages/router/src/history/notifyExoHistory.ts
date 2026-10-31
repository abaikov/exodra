export function notifyExoHistory(subscribers: Set<() => void>): void {
    subscribers.forEach((update) => update());
}
