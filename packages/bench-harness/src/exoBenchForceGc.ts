export function exoBenchForceGc(): (() => void) | undefined {
    return (globalThis as { gc?: () => void }).gc;
}
