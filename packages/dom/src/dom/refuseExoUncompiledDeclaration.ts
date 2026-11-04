export function refuseExoUncompiledDeclaration(): never {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? 'exodra: a machine whose declaration carries no DOM JSON form reached a backend ' +
              'that cannot compile one. Either compose withExoCompiler(new ExoDomBackend()), ' +
              'or declare it with exoJsx under @exodra/babel-plugin-schema, which compiles the ' +
              'declaration at build time and writes that form onto it.'
            : 'EXO0099'
    );
}
