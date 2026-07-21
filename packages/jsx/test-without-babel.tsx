// Test if we can use Exodra JSX without our Babel plugin
import { jsx } from './packages/jsx/dist/jsx-runtime.js';

// This is what TypeScript would compile to:
const element = jsx('div', {
    static: { id: 'test', className: 'foo' },
    bindables: { onClick: () => console.log('clicked') }
});

console.log('Element created:', element);
