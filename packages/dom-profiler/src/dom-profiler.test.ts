// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { h } from '@exodra/core';
import { mount, ExoNodeDom } from '@exodra/dom';
import { profileDom } from './dom-profiler';

describe('profileDom', () => {
    it('records ExoNodeDom method timings while rendering (under jsdom)', () => {
        const profiler = profileDom();

        const container = document.createElement('div');
        document.body.appendChild(container);
        const node = mount(
            h('div', {
                static: {
                    class: 'app',
                    children: [
                        h('span', { static: { textContent: 'a' } }),
                        h('span', { static: { textContent: 'b' } }),
                    ],
                },
            }) as never,
            container
        );

        const report = profiler.stop();
        node.dispose();
        container.remove();

        // The build path ran, so buildTree is recorded with a positive count.
        const buildTree = report.find(e => e.method === 'buildTree');
        expect(buildTree).toBeDefined();
        expect(buildTree!.count).toBeGreaterThan(0);
        expect(buildTree!.avgMs).toBeGreaterThanOrEqual(0);
        // More than one method was profiled.
        expect(report.length).toBeGreaterThan(1);
    });

    it('stop() restores ExoNodeDom methods (reversible, no leftover patching)', () => {
        const proto = ExoNodeDom.prototype as unknown as Record<string, unknown>;
        const original = proto.buildTree;

        const profiler = profileDom({ methods: ['buildTree'] });
        expect(proto.buildTree).not.toBe(original); // patched

        profiler.stop();
        expect(proto.buildTree).toBe(original); // restored
    });
});
