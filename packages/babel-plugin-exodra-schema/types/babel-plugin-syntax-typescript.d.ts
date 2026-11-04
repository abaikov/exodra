// Ships no types, like `@babel/plugin-syntax-jsx`: see babel-plugin-syntax-jsx.d.ts.
declare module '@babel/plugin-syntax-typescript' {
    import type { PluginTarget } from '@babel/core';

    const syntaxTypeScript: PluginTarget;
    export default syntaxTypeScript;
}
