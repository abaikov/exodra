// One subscription policy for both histories. What differs is the SET, which each history owns.
export function subscribeExoHistory(subscribers: Set<() => void>, update: () => void): () => void {
    subscribers.add(update);
    return () => {
        subscribers.delete(update);
    };
}
