import type { ExoNode } from '@exodra/core';
import { profileExoNode, type TExoProfileCallback } from './exodra-profiler';

/**
 * Enable profiling for ExoNode
 * Now requires passing the ExoNode class since core no longer has built-in profiling
 */
export function enableProfiling(ExoNodeClass: typeof ExoNode, callback: TExoProfileCallback): () => void {
    // Use the new external patching approach
    profileExoNode(ExoNodeClass, callback);
    
    // Return a no-op since we can't easily unpatch
    return () => {
        console.warn('Profiling removal not supported with new patching approach. Restart app to disable.');
    };
}

/**
 * @deprecated Core no longer has built-in profiling
 */
export function disableProfiling(): void {
    console.warn('disableProfiling() is deprecated. Core no longer has built-in profiling.');
}

/**
 * @deprecated Always returns false since core no longer has built-in profiling
 */
export function isProfiling(): boolean {
    return false;
}

/**
 * Create custom middleware for profiling
 * @deprecated Middleware is no longer supported in core
 */
export function createProfilingMiddleware(
    _callback: TExoProfileCallback
): Record<string, never> {
    console.warn('createProfilingMiddleware() is deprecated. Use profileExoNode() instead.');
    return {};
}