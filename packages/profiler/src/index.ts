/**
 * @deprecated `@exodra/profiler` profiled the per-node `ExoNode` base class, which
 * has been removed (the DOM and string renderers no longer share a base). Use
 * `@exodra/dom-profiler` to profile the live DOM renderer (`ExoNodeDom`) — it also
 * works under jsdom. The generic `profileClass`/`ClassProfiler` below still work on
 * any class, but this package as a whole is no longer maintained.
 */
// eslint-disable-next-line no-console
console.warn(
    '[@exodra/profiler] deprecated — it targeted the removed ExoNode base. Use @exodra/dom-profiler.'
);

// Export new profiling approach
export { profileClass, ClassProfiler, type ProfileMetrics, type ProfileCallback } from './class-profiler';
export { profileExoNode, type TExoProfileMetrics, type TExoProfileCallback } from './exodra-profiler';

// Export Profiler component and utilities
export { 
  Profiler, 
  profiler, 
  withProfiler,
  ExodraProfiler,
  type ProfilerProps,
  type ProfileReport 
} from './Profiler';

// Export middleware (mostly deprecated now)
export { 
  enableProfiling,
  disableProfiling,
  isProfiling,
  createProfilingMiddleware
} from './middleware';

// Re-export convenience functions
export { startProfiling, stopProfiling, getProfilingReport } from './utils';