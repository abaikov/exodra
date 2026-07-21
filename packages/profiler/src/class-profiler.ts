/**
 * Generic class profiler that can patch any class for performance monitoring
 * Zero overhead when not imported
 */

// A class constructor we can profile. We only ever read `.name` and
// `.prototype`, so the parameter/instance shapes are intentionally permissive.
export type ProfilableClass = new (...args: never[]) => object;

export interface ProfileMetrics {
    className: string;
    method: string;
    duration: number;
    timestamp: number;
    args?: unknown[];
}

export type ProfileCallback = (metrics: ProfileMetrics) => void;

/**
 * Profile any class by patching its prototype methods
 * 
 * @param ClassToProfile - The class constructor to profile
 * @param callback - Called with metrics for each method call
 * @param options - Which methods to profile (default: all)
 */
export function profileClass<T extends ProfilableClass>(
    ClassToProfile: T,
    callback: ProfileCallback,
    options: {
        methods?: string[];
        excludeMethods?: string[];
        includePrivate?: boolean;
    } = {}
): void {
    const className = ClassToProfile.name;
    // Prototype is patched dynamically by method name, so treat it as an
    // index of unknown method implementations.
    const proto = ClassToProfile.prototype as Record<string, unknown>;

    // Get all method names
    const allMethods = Object.getOwnPropertyNames(proto);
    
    for (const methodName of allMethods) {
        // Skip constructor
        if (methodName === 'constructor') continue;
        
        // Skip if excluded
        if (options.excludeMethods?.includes(methodName)) continue;
        
        // Skip if not in include list (if provided)
        if (options.methods && !options.methods.includes(methodName)) continue;
        
        // Skip private methods unless explicitly included
        if (!options.includePrivate && methodName.startsWith('_')) continue;
        
        const descriptor = Object.getOwnPropertyDescriptor(proto, methodName);
        if (!descriptor || typeof descriptor.value !== 'function') continue;

        const originalMethod = descriptor.value as (
            this: unknown,
            ...args: unknown[]
        ) => unknown;

        // Patch the method
        const patched = function (this: unknown, ...args: unknown[]) {
            const start = performance.now();
            
            try {
                // Call original method
                const result = originalMethod.apply(this, args);
                
                // Handle async methods
                if (result instanceof Promise) {
                    return result.finally(() => {
                        const duration = performance.now() - start;
                        callback({
                            className,
                            method: methodName,
                            duration,
                            timestamp: Date.now(),
                            args: options.methods?.includes(methodName) ? args : undefined
                        });
                    });
                }
                
                // Sync method - report immediately
                const duration = performance.now() - start;
                callback({
                    className,
                    method: methodName,
                    duration,
                    timestamp: Date.now(),
                    args: options.methods?.includes(methodName) ? args : undefined
                });
                
                return result;
            } catch (error) {
                // Still report on errors
                const duration = performance.now() - start;
                callback({
                    className,
                    method: methodName,
                    duration,
                    timestamp: Date.now(),
                    args: options.methods?.includes(methodName) ? args : undefined
                });
                throw error;
            }
        };

        proto[methodName] = patched;

        // Preserve method name and length for better debugging
        Object.defineProperty(patched, 'name', { value: methodName });
        Object.defineProperty(patched, 'length', { value: originalMethod.length });
    }
}

/**
 * Batch profiler for multiple classes
 */
export class ClassProfiler {
    private metrics: ProfileMetrics[] = [];
    private isRecording = false;
    
    profileClasses(classes: Array<ProfilableClass>, options?: Parameters<typeof profileClass>[2]): void {
        for (const ClassToProfile of classes) {
            profileClass(ClassToProfile, (metrics) => {
                if (this.isRecording) {
                    this.metrics.push(metrics);
                }
            }, options);
        }
    }
    
    start(): void {
        this.isRecording = true;
        this.metrics = [];
    }
    
    stop(): ProfileMetrics[] {
        this.isRecording = false;
        return this.metrics;
    }
    
    getReport(): { [key: string]: { count: number; totalTime: number; avgTime: number } } {
        const report: { [key: string]: { count: number; totalTime: number; avgTime: number } } = {};
        
        for (const metric of this.metrics) {
            const key = `${metric.className}.${metric.method}`;
            if (!report[key]) {
                report[key] = { count: 0, totalTime: 0, avgTime: 0 };
            }
            report[key].count++;
            report[key].totalTime += metric.duration;
            report[key].avgTime = report[key].totalTime / report[key].count;
        }
        
        return report;
    }
}