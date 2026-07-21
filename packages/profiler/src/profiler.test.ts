import { describe, it, expect, beforeEach } from 'vitest';
import { ExoNode, type TExoNodeSchema } from '@exodra/core';
import { profileExoNode, profileClass, ClassProfiler } from './index';
import type { ProfileMetrics, TExoProfileMetrics } from './index';

describe('Profiler with patching approach', () => {
    let metricsCollected: TExoProfileMetrics[] = [];
    
    beforeEach(() => {
        metricsCollected = [];
    });
    
    it('should profile ExoNode methods via patching', () => {
        // Create a test class that extends ExoNode
        class TestNode extends ExoNode {
            constructor(schema: TExoNodeSchema) {
                super(schema, undefined, true);
            }
        }
        
        // Profile the class. TestNode narrows ExoNode's generic constructor, so
        // cast to the base class type expected by profileExoNode.
        profileExoNode(TestNode as unknown as typeof ExoNode, (metrics) => {
            metricsCollected.push(metrics);
        });
        
        // Create and dispose a node
        const node = new TestNode({ type: 'div', attrs: {} });
        node.dispose();
        
        // Should have collected metrics for init and dispose
        expect(metricsCollected.length).toBeGreaterThanOrEqual(2);
        
        const initMetric = metricsCollected.find(m => m.phase === 'init');
        const disposeMetric = metricsCollected.find(m => m.phase === 'unmount');
        
        expect(initMetric).toBeDefined();
        expect(disposeMetric).toBeDefined();
        expect(initMetric!.duration).toBeGreaterThanOrEqual(0);
        expect(disposeMetric!.duration).toBeGreaterThanOrEqual(0);
    });
    
    it('should profile any class with profileClass', () => {
        class TestClass {
            counter = 0;
            
            increment() {
                this.counter++;
            }
            
            decrement() {
                this.counter--;
            }
            
            async asyncMethod() {
                await new Promise(resolve => setTimeout(resolve, 10));
                return 'done';
            }
        }
        
        const collected: ProfileMetrics[] = [];

        profileClass(TestClass, (metrics) => {
            collected.push(metrics);
        });
        
        const instance = new TestClass();
        instance.increment();
        instance.decrement();
        
        expect(collected.length).toBe(2);
        expect(collected[0].method).toBe('increment');
        expect(collected[1].method).toBe('decrement');
        expect(collected[0].className).toBe('TestClass');
    });
    
    it('should handle async methods correctly', async () => {
        class AsyncTest {
            async doWork() {
                await new Promise(resolve => setTimeout(resolve, 50));
                return 'completed';
            }
        }
        
        const collected: ProfileMetrics[] = [];

        profileClass(AsyncTest, (metrics) => {
            collected.push(metrics);
        });
        
        const instance = new AsyncTest();
        const result = await instance.doWork();
        
        expect(result).toBe('completed');
        expect(collected.length).toBe(1);
        expect(collected[0].duration).toBeGreaterThanOrEqual(50);
    });
    
    it('should work with ClassProfiler for batch profiling', () => {
        class ClassA {
            methodA() { return 'a'; }
        }
        
        class ClassB {
            methodB() { return 'b'; }
        }
        
        const profiler = new ClassProfiler();
        profiler.profileClasses([ClassA, ClassB]);
        profiler.start();
        
        const a = new ClassA();
        const b = new ClassB();
        
        a.methodA();
        a.methodA();
        b.methodB();
        
        const metrics = profiler.stop();
        const report = profiler.getReport();
        
        expect(metrics.length).toBe(3);
        expect(report['ClassA.methodA'].count).toBe(2);
        expect(report['ClassB.methodB'].count).toBe(1);
    });
    
    it('should calculate depth correctly for nested nodes', () => {
        class TestNode extends ExoNode {}
        
        const collected: TExoProfileMetrics[] = [];
        profileExoNode(TestNode as unknown as typeof ExoNode, (metrics) => {
            collected.push(metrics);
        });
        
        const parent = new TestNode({ type: 'div', attrs: {} });
        const child = new TestNode({ type: 'span', attrs: {} }, parent);
        const _grandchild = new TestNode({ type: 'text', attrs: {} }, child);
        
        // Find init metrics
        const parentInit = collected.find(m => m.phase === 'init' && m.depth === 0);
        const childInit = collected.find(m => m.phase === 'init' && m.depth === 1);
        const grandchildInit = collected.find(m => m.phase === 'init' && m.depth === 2);
        
        expect(parentInit).toBeDefined();
        expect(childInit).toBeDefined();
        expect(grandchildInit).toBeDefined();
    });
    
    it('should not affect functionality when profiling', () => {
        class Calculator {
            add(a: number, b: number): number {
                return a + b;
            }
            
            multiply(a: number, b: number): number {
                return a * b;
            }
        }
        
        profileClass(Calculator, () => {});
        
        const calc = new Calculator();
        expect(calc.add(2, 3)).toBe(5);
        expect(calc.multiply(4, 5)).toBe(20);
    });
    
    it('should handle errors without breaking functionality', () => {
        class ErrorTest {
            throwError() {
                throw new Error('Test error');
            }
        }
        
        const collected: ProfileMetrics[] = [];
        profileClass(ErrorTest, (metrics) => {
            collected.push(metrics);
        });
        
        const instance = new ErrorTest();
        
        expect(() => instance.throwError()).toThrow('Test error');
        expect(collected.length).toBe(1);
        expect(collected[0].method).toBe('throwError');
        expect(collected[0].duration).toBeGreaterThanOrEqual(0);
    });
});