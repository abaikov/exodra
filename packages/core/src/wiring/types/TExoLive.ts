export interface TExoLive {
    /**
     * THE ENGINE ALWAYS CALLS `live.setMounted(live, on)`: argument 1 is the object holding the slot,
     * which is how ONE shared function serves many instances. */
    setMounted?: ((live: TExoLive, on: boolean) => void) | null;
}
