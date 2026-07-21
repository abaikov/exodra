import type { TExoContext, TExoSchema, ExoNode } from '@exodra/core';
import type { TExoProfileMetrics } from './exodra-profiler';
import { profileExoNode } from './exodra-profiler';

export interface ProfilerProps {
  id: string;
  onRender?: (id: string, phase: string, duration: number) => void;
  children: TExoSchema | readonly TExoSchema[];
}

/**
 * Profiler component for wrapping parts of the tree
 * Similar to React.Profiler but for Exodra
 */
export function Profiler(context: TExoContext): TExoSchema | readonly TExoSchema[] {
  const id = context.getConstant('id') as string;
  const onRender = context.getConstant('onRender') as ProfilerProps['onRender'];
  const children = context.getConstant('children') as TExoSchema | readonly TExoSchema[];
  
  if (!onRender) {
    // Return children without profiling if no callback
    return children;
  }
  
  // Track unmount phase with dispose
  const startTime = performance.now();
  
  context.onDispose(() => {
    const duration = performance.now() - startTime;
    onRender?.(id, 'unmount', duration);
  });
  
  // Wrap children to track their performance
  const wrappedChildren = Array.isArray(children) 
    ? children.map(child => wrapProfilerSchema(child, id, onRender))
    : children;
  
  return wrappedChildren;
}

function wrapProfilerSchema(
  schema: TExoSchema,
  parentId: string,
  onRender?: ProfilerProps['onRender']
): TExoSchema {
  // For component schemas, we can intercept and measure
  if (typeof schema === 'object' && schema && typeof schema.type === 'function') {
    const originalComponent = schema.type;
    
    return {
      ...schema,
      type: (context: TExoContext) => {
        const startTime = performance.now();
        const result = originalComponent(context);
        const duration = performance.now() - startTime;
        
        onRender?.(parentId, 'render', duration);
        
        return result;
      }
    };
  }
  
  return schema;
}

/**
 * Global profiler for collecting metrics
 */
export class ExodraProfiler {
  private profiles = new Map<string, ProfileData>();
  private isRecording = false;
  private startTime = 0;
  private ExoNodeClass?: typeof ExoNode;
  
  constructor(ExoNodeClass?: typeof ExoNode) {
    this.ExoNodeClass = ExoNodeClass;
  }
  
  start(): void {
    if (!this.ExoNodeClass) {
      console.warn('ExodraProfiler: No ExoNode class provided. Pass it to constructor.');
      return;
    }
    
    this.isRecording = true;
    this.startTime = performance.now();
    this.profiles.clear();
    
    profileExoNode(this.ExoNodeClass, (metrics) => {
      this.recordMetrics(metrics);
    });
    
    console.log('🎬 Exodra Profiler: Started');
  }
  
  stop(): ProfileReport {
    this.isRecording = false;
    // Note: Can't unpatch, need app restart
    
    const duration = performance.now() - this.startTime;
    const report = this.generateReport(duration);
    
    console.log('⏹️ Exodra Profiler: Stopped (patching remains active until restart)');
    console.table(report.components);
    
    return report;
  }
  
  private recordMetrics(metrics: TExoProfileMetrics): void {
    if (!this.isRecording) return;
    
    let profile = this.profiles.get(metrics.componentId);
    if (!profile) {
      profile = {
        componentId: metrics.componentId,
        renderCount: 0,
        totalDuration: 0,
        phases: new Map(),
        depths: [],
        childCounts: []
      };
      this.profiles.set(metrics.componentId, profile);
    }
    
    profile.renderCount++;
    profile.totalDuration += metrics.duration;
    
    const phaseCount = profile.phases.get(metrics.phase) || 0;
    profile.phases.set(metrics.phase, phaseCount + 1);
    
    profile.depths.push(metrics.depth);
    profile.childCounts.push(metrics.childCount);
  }
  
  private generateReport(totalDuration: number): ProfileReport {
    const components = Array.from(this.profiles.values())
      .map(profile => ({
        id: profile.componentId,
        renders: profile.renderCount,
        totalTime: profile.totalDuration,
        averageTime: profile.totalDuration / profile.renderCount,
        percentOfTotal: (profile.totalDuration / totalDuration) * 100,
        averageDepth: profile.depths.reduce((a, b) => a + b, 0) / profile.depths.length,
        averageChildren: profile.childCounts.reduce((a, b) => a + b, 0) / profile.childCounts.length
      }))
      .sort((a, b) => b.totalTime - a.totalTime);
    
    return {
      totalDuration,
      componentCount: components.length,
      totalRenders: components.reduce((sum, c) => sum + c.renders, 0),
      components
    };
  }
}

interface ProfileData {
  componentId: string;
  renderCount: number;
  totalDuration: number;
  phases: Map<string, number>;
  depths: number[];
  childCounts: number[];
}

export interface ProfileReport {
  totalDuration: number;
  componentCount: number;
  totalRenders: number;
  components: Array<{
    id: string;
    renders: number;
    totalTime: number;
    averageTime: number;
    percentOfTotal: number;
    averageDepth: number;
    averageChildren: number;
  }>;
}

// Global instance
export const profiler = new ExodraProfiler();

/**
 * Convenience function to wrap components with profiling
 */
export function withProfiler<T extends TExoSchema | readonly TExoSchema[]>(
  id: string,
  component: T,
  onRender?: (id: string, phase: string, duration: number) => void
): TExoSchema {
  return {
    type: Profiler,
    attrs: {
      static: {
        id,
        onRender: onRender || ((id: string, phase: string, duration: number) => {
          console.log(`Profiler [${id}]: ${phase} took ${duration.toFixed(2)}ms`);
        }),
        children: component
      }
    }
  };
}