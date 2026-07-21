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