// Transform-level tests for the `bind:` directive. Run: node bind.test.mjs
import babel from '@babel/core';
import assert from 'node:assert';
import plugin from './dist/index.cjs';

const tx = src =>
    babel.transformSync(src, {
        babelrc: false,
        configFile: false,
        filename: 's.tsx',
        presets: [['@babel/preset-typescript', { isTSX: true, allExtensions: true }]],
        plugins: [['@babel/plugin-syntax-jsx'], plugin.default ?? plugin],
    }).code;

let pass = 0;
const check = (name, cond) => {
    assert.ok(cond, name);
    console.log('✓', name);
    pass++;
};

// 1. text input -> bindText, wrapped in mergeAttrs, both imports injected.
{
    const out = tx('const x = <input static={{ class: "f" }} bind:value={title} />;');
    check('text input picks bindText', /bindText\(title\)/.test(out));
    check('wraps in mergeAttrs with base props', /mergeAttrs\(\{[\s\S]*class: "f"[\s\S]*\}, bindText\(title\)\)/.test(out));
    check('imports mergeAttrs from @exodra/jsx', /import \{ mergeAttrs \} from "@exodra\/jsx"/.test(out));
    check('imports bindText from @exodra/forms', /import \{ bindText \} from "@exodra\/forms"/.test(out));
}

// 2. element type selects the helper at compile time.
{
    check('select -> bindSelect', /bindSelect\(s\)/.test(tx('const x = <select bind:value={s}><option/></select>;')));
    check('textarea -> bindText', /bindText\(n\)/.test(tx('const x = <textarea bind:value={n} />;')));
    check('number input -> bindNumber', /bindNumber\(c\)/.test(tx('const x = <input static={{ type: "number" }} bind:value={c} />;')));
    check('checkbox bind:checked -> bindChecked', /bindChecked\(d\)/.test(tx('const x = <input static={{ type: "checkbox" }} bind:checked={d} />;')));
}

// 3. only the used helpers are imported (tree-shaking-friendly).
{
    const out = tx('const x = <input static={{ type: "number" }} bind:value={c} />;');
    check('imports only bindNumber', /import \{ bindNumber \} from "@exodra\/forms"/.test(out) && !/bindText/.test(out));
}

// 4. no bind -> no mergeAttrs / no forms import (pay for what you use).
{
    const out = tx('const x = <input static={{ class: "plain" }} />;');
    check('plain element: no mergeAttrs', !/mergeAttrs/.test(out));
    check('plain element: no @exodra/forms import', !/@exodra\/forms/.test(out));
}

// 5. bind composes with normal handlers/attrs on the same element.
{
    const out = tx('const x = <input static={{ class: "f" }} handlers={{ onFocus: f }} bind:value={title} />;');
    check('keeps onFocus handler alongside bind', /onFocus: f/.test(out));
    check('still calls bindText', /bindText\(title\)/.test(out));
}

// cache:key directive -> 3rd arg of h(), not a DOM attribute
{
    const out = tx('const x = <li cache:key={ROW} static={{ class: "r" }}>x</li>;');
    check('cache:key emits the 3rd h() arg', /h\("li",\s*\{[\s\S]*?\},\s*ROW\)/.test(out));
    check('cache:key is not written as a static prop', !/"cache:key"/.test(out));
    check('keeps the real attrs alongside cache:key', /class: "r"/.test(out));
}
// cache:key alone (no other props) still gets an attrs slot before the key
{
    const out = tx('const x = <li cache:key={ROW} />;');
    check('cache:key with no props -> h("li", {}, ROW)', /h\("li",\s*\{\s*\},\s*ROW\)/.test(out));
}

// auto cacheKey: repeated statics (.map) get a Symbol key; one-offs / dynamics don't
{
    const inMap = tx('const C = () => <ul>{xs.map(x => <li static={{ class: "it" }}>y</li>)}</ul>;');
    check(
        'auto-cacheKey: static in .map gets a Symbol key as 3rd arg',
        /const _ck\d* = Symbol\(\);/.test(inMap) &&
            /h\("li",[\s\S]*?\}, _ck\d*\)/.test(inMap)
    );
    const oneOff = tx('const C = () => <div static={{ class: "box" }}>hi</div>;');
    check('auto-cacheKey: top-level static gets NO key', !/Symbol\(\)/.test(oneOff));
    const dynInMap = tx(
        'const C = () => <ul>{xs.map(x => <li bindable={{ textContent: x }} />)}</ul>;'
    );
    check('auto-cacheKey: dynamic in .map gets NO key', !/Symbol\(\)/.test(dynInMap));
}

console.log(`\nBIND TRANSFORM: ${pass} checks passed`);
