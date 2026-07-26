import { describe, expect, it } from 'vitest';
import { mergeAttrs } from './mergeAttrs';

describe('mergeAttrs', () => {
    it('merges buckets across base and partials', () => {
        const out = mergeAttrs(
            { static: { id: 'a' }, handlers: { onClick: () => {} } },
            { bindables: { value: 'b' } },
            { handlers: { onInput: () => {} } }
        ) as Record<string, Record<string, unknown>>;

        expect(out.static.id).toBe('a');
        expect(out.bindables.value).toBe('b');
        expect(Object.keys(out.handlers).sort()).toEqual(['onClick', 'onInput']);
    });

    it('later partials override the same key (shallow)', () => {
        const out = mergeAttrs(
            { static: { class: 'base' } },
            { static: { class: 'override' } }
        ) as Record<string, Record<string, unknown>>;
        expect(out.static.class).toBe('override');
    });

    it('skips null / undefined partials', () => {
        const out = mergeAttrs({ static: { id: 'x' } }, null, undefined);
        expect((out as Record<string, Record<string, unknown>>).static.id).toBe(
            'x'
        );
    });

    it('composes onExoMount from several partials (all run, in order)', () => {
        const calls: string[] = [];
        const out = mergeAttrs(
            { static: { onExoMount: () => calls.push('base') } },
            { static: { onExoMount: () => calls.push('dir1') } },
            { static: { onExoMount: () => calls.push('dir2') } }
        ) as { static: { onExoMount: (n: unknown) => void } };

        out.static.onExoMount({});
        expect(calls).toEqual(['base', 'dir1', 'dir2']);
    });

    it('composes onExoUnmount too', () => {
        const calls: string[] = [];
        const out = mergeAttrs(
            { static: { onExoUnmount: () => calls.push('a') } },
            { static: { onExoUnmount: () => calls.push('b') } }
        ) as { static: { onExoUnmount: (n: unknown) => void } };

        out.static.onExoUnmount({});
        expect(calls).toEqual(['a', 'b']);
    });
});
