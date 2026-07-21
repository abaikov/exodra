import { ExoNode } from '@exodra/core';
import type { TExoProfileCallback } from './exodra-profiler';
import { profileExoNode } from './exodra-profiler';
import { profiler } from './Profiler';
import type { ProfileReport } from './Profiler';

// Minimal view of the browser `window` this module touches. Kept local so the
// package builds in non-DOM (Node) environments where `window` is absent.
type TExoBrowserWindow = {
    performance?: { measure?: (...args: unknown[]) => unknown };
    postMessage(message: unknown, targetOrigin: string): void;
    __EXODRA_DEVTOOLS_HOOK__?: unknown;
};

function getBrowserWindow(): TExoBrowserWindow | undefined {
    if (typeof globalThis === 'undefined') {
        return undefined;
    }
    const maybeWindow = (globalThis as { window?: TExoBrowserWindow }).window;
    return typeof maybeWindow !== 'undefined' ? maybeWindow : undefined;
}

/**
 * Start profiling the application
 * Note: Requires passing ExoNode class now since core no longer has built-in profiling
 */
export function startProfiling(callback?: TExoProfileCallback): void {
  if (callback) {
    // Need to patch ExoNode externally now
    profileExoNode(ExoNode, callback);
    console.warn('Profiling enabled via patching. Cannot be disabled without restart.');
  } else {
    profiler.start();
  }
  
  // Add Chrome DevTools integration if available
  const browserWindow = getBrowserWindow();
  if (browserWindow?.performance?.measure) {
    console.log('📊 Chrome DevTools Performance tab integration enabled');
  }
}

/**
 * Stop profiling and get the report
 * Note: Cannot actually unpatch, just stops recording
 */
export function stopProfiling(): ProfileReport | null {
  return profiler.stop();
}

/**
 * Get the current profiling report without stopping
 */
export function getProfilingReport(): ProfileReport | null {
  console.warn('Getting report without stopping profiling');
  return null; // Would need to implement snapshot functionality
}

/**
 * React DevTools-like integration for Exodra
 */
export function installDevToolsHook(): void {
  const win = getBrowserWindow();
  if (!win) return;

  const hook = {
    Exodra: {
      version: '0.1.0',
      profiler: {
        start: startProfiling,
        stop: stopProfiling,
        getReport: getProfilingReport
      }
    }
  };
  
  win.__EXODRA_DEVTOOLS_HOOK__ = hook;
  
  // Dispatch event for browser extension
  win.postMessage({
    source: 'exodra-devtools',
    payload: {
      type: 'init',
      version: '0.1.0'
    }
  }, '*');
}

// Auto-install in development
if (getBrowserWindow() && process.env.NODE_ENV !== 'production') {
  installDevToolsHook();
}