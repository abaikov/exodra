// Compiler ↔ runtime compatibility.
//
// The compiler emits `import { X } from '@exodra/…'` statements. Every name it
// emits MUST actually be exported by the runtime package it targets — otherwise
// the compiled code throws at import time. This test compiles a battery of
// inputs exercising every emit path and asserts each emitted import resolves.
// It's the "compiler/runtime version‑compat" guard: rename `text` in core, or
// point a directive at a helper that no longer exists, and this fails.

import { describe, it, expect } from 'vitest';
import * as babel from '@babel/core';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import * as core from '@exodra/core';
import * as jsx from '@exodra/jsx';
import * as forms from '@exodra/forms';
import * as reactivity from '@exodra/reactivity';
import * as srcPluginModule from '../src/index';

const plugin =
    (srcPluginModule as { default?: unknown }).default ??
    (srcPluginModule as unknown);

const runtimes: Record<string, Record<string, unknown>> = {
    '@exodra/core': core as Record<string, unknown>,
    '@exodra/jsx': jsx as Record<string, unknown>,
    '@exodra/forms': forms as Record<string, unknown>,
    '@exodra/reactivity': reactivity as Record<string, unknown>,
};

function compile(src: string): string {
    const res = babel.transformSync(src, {
        filename: 'input.tsx',
        babelrc: false,
        configFile: false,
        presets: [
            ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
        ],
        plugins: [
            [syntaxJsx, { throwIfNamespace: false }],
            [plugin as babel.PluginItem, { importSource: '@exodra/core' }],
        ],
    });
    return res?.code ?? '';
}

// Exercise every path that can inject a runtime import.
const INPUTS: string[] = [
    `const v = <div />;`,
    `const v = <div static={{ id: 'x' }}>hi</div>;`,
    `const v = <div>{count}</div>;`,
    `const v = <button handlers={{ onClick: f }}>x</button>;`,
    `const v = <button bindableHandlers={{ onClick: sig }} />;`,
    `const v = <ul bindableList={{ children: rows }} />;`,
    `const v = <input bind:value={m} />;`,
    `const v = <input bind:checked={m} />;`,
    `const v = <li cache:key={k} static={{ id: 'r' }} />;`,
    `const v = <>{a}{b}</>;`,
    `const v = <><span>x</span></>;`,
    `const C = () => <div />; const v = <><C /><C /></>;`,
];

const IMPORT_RE = /import\s*\{([^}]*)\}\s*from\s*["'](@exodra\/[^"']+)["']/g;

describe('@exodra/babel-plugin-jsx — compiler/runtime compat', () => {
    it('every @exodra import the compiler emits is exported by the runtime', () => {
        const missing: string[] = [];
        for (const input of INPUTS) {
            const code = compile(input);
            let m: RegExpExecArray | null;
            IMPORT_RE.lastIndex = 0;
            while ((m = IMPORT_RE.exec(code)) !== null) {
                const pkg = m[2];
                const names = m[1]
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                const rt = runtimes[pkg];
                if (!rt) {
                    missing.push(`unknown runtime package ${pkg} (from: ${input})`);
                    continue;
                }
                for (const name of names) {
                    if (!(name in rt)) {
                        missing.push(`${name} not exported by ${pkg} (from: ${input})`);
                    }
                }
            }
        }
        expect(missing).toEqual([]);
    });
});
