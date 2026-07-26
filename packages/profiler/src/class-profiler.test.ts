import { describe, expect, it, vi } from 'vitest';
import { profileClass, ClassProfiler, type ProfileMetrics } from './class-profiler';

describe('profileClass', () => {
    it('patches prototype methods and reports metrics on each call', () => {
        class Calc {
            add(a: number, b: number): number {
                return a + b;
            }
        }
        const seen: ProfileMetrics[] = [];
        profileClass(Calc, m => seen.push(m));

        expect(new Calc().add(2, 3)).toBe(5); // original behaviour preserved
        expect(seen).toHaveLength(1);
        expect(seen[0]).toMatchObject({ className: 'Calc', method: 'add' });
        expect(typeof seen[0].duration).toBe('number');
    });

    it('reports async methods once the promise settles', async () => {
        class Api {
            async load(): Promise<string> {
                return 'ok';
            }
        }
        const seen: ProfileMetrics[] = [];
        profileClass(Api, m => seen.push(m));

        const result = await new Api().load();
        expect(result).toBe('ok');
        expect(seen).toHaveLength(1);
        expect(seen[0].method).toBe('load');
    });

    it('still reports (and rethrows) when a method throws', () => {
        class Boom {
            go(): never {
                throw new Error('nope');
            }
        }
        const seen: ProfileMetrics[] = [];
        profileClass(Boom, m => seen.push(m));

        expect(() => new Boom().go()).toThrow('nope');
        expect(seen).toHaveLength(1);
        expect(seen[0].method).toBe('go');
    });

    it('respects include / exclude / private options', () => {
        class Svc {
            a(): void {}
            b(): void {}
            _secret(): void {}
        }
        const only: string[] = [];
        profileClass(Svc, m => only.push(m.method), { methods: ['a'] });
        const s = new Svc();
        s.a();
        s.b();
        s._secret();
        expect(only).toEqual(['a']); // b excluded (not in list), _secret private-skipped
    });

    it('captures args only for explicitly-listed methods', () => {
        class Svc {
            run(x: number): void {
                void x;
            }
        }
        const withArgs: ProfileMetrics[] = [];
        profileClass(Svc, m => withArgs.push(m), { methods: ['run'] });
        new Svc().run(42);
        expect(withArgs[0].args).toEqual([42]);
    });
});

describe('ClassProfiler', () => {
    it('records metrics only between start() and stop() and aggregates a report', () => {
        class Widget {
            render(): void {}
        }
        const profiler = new ClassProfiler();
        profiler.profileClasses([Widget]);

        const w = new Widget();
        w.render(); // before start() → ignored
        profiler.start();
        w.render();
        w.render();
        const metrics = profiler.stop();
        w.render(); // after stop() → ignored

        expect(metrics).toHaveLength(2);
        const report = profiler.getReport();
        expect(report['Widget.render'].count).toBe(2);
        expect(report['Widget.render'].avgTime).toBeCloseTo(
            report['Widget.render'].totalTime / 2
        );
    });
});

describe('deprecated index entry point', () => {
    it('warns on import and re-exports the generic profiler', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const mod = await import('./index');
        expect(mod.profileClass).toBe(profileClass);
        expect(mod.ClassProfiler).toBe(ClassProfiler);
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('@exodra/dom-profiler')
        );
        warn.mockRestore();
    });
});
