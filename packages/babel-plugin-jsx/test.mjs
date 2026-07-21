import * as babel from '@babel/core';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const plugin = require('./dist/index.cjs').default;

const testCases = [
    {
        name: 'Simple element',
        input: '<div />',
        expected: 'h("div")'
    },
    {
        name: 'Element with static props (explicit bucket)',
        input: '<div static={{ id: "test", className: "foo" }} />',
        expected: 'static: {' // Should use 'static' not 'constants'
    },
    {
        name: 'Element with children',
        input: '<div>Hello</div>',
        expected: 'static: {'
    },
    {
        name: 'Fragment with children',
        input: '<>Hello</>',
        expected: 'text("Hello")'
    },
    {
        name: 'Expression child',
        input: '<div>{count}</div>',
        expected: 'children: count'
    },
    {
        name: 'Mixed props (static, bindables, bindableLists)',
        input: '<div static={{id: "test"}} bindable={{onClick: handler}} bindableList={{items: list}} />',
        expected: 'static: {'
    },
    {
        name: 'Handlers go in the handlers bucket',
        input: '<button handlers={{ onClick: handleClick }}>Click</button>',
        expected: 'handlers: {'
    },
    {
        name: 'STRICT: flat event prop throws',
        input: '<button onClick={handleClick}>Click</button>',
        shouldThrow: /flat event prop "onClick" is not allowed/
    },
    {
        name: 'STRICT: flat plain attribute throws',
        input: '<div class="foo" />',
        shouldThrow: /flat attribute "class" is not allowed/
    }
];

console.log('Testing Babel Plugin JSX\n');
console.log('='.repeat(50));

let passed = 0;
let failed = 0;

for (const test of testCases) {
    try {
        const result = babel.transformSync(test.input, {
            filename: 'test.tsx',
            plugins: [
                ['@babel/plugin-syntax-jsx', { throwIfNamespace: false }],
                [plugin, { importSource: '@exodra/core' }]
            ]
        });

        if (test.shouldThrow) {
            console.log(`❌ ${test.name}: expected a throw, but it compiled`);
            failed++;
        } else if (result.code.includes(test.expected)) {
            console.log(`✅ ${test.name}`);
            passed++;
        } else {
            console.log(`❌ ${test.name}`);
            console.log(`   Expected: "${test.expected}"`);
            console.log(`   Got: ${result.code.substring(0, 100)}...`);
            failed++;
        }
    } catch (error) {
        if (test.shouldThrow && test.shouldThrow.test(error.message)) {
            console.log(`✅ ${test.name} (threw as expected)`);
            passed++;
        } else {
            console.log(`❌ ${test.name}: ${error.message}`);
            failed++;
        }
    }
}

console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
    process.exit(1);
}