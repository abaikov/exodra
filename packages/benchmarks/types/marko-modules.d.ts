// `*.marko` FILES HAVE NO TYPES, AND THIS SAYS SO RATHER THAN LETTING THE CHECKER SAY IT.
//
// Five axes import a Marko participant (`./marko/MkList.marko`, `MkReconcile`, `MkReactive`,
// `MkToggle`, `CardsDyn`). Marko compiles those through its own Vite plugin at run time; there is
// no `.d.ts` beside them and none is generated, so `tsconfig.typecheck.json` reports five
// `TS2307 Cannot find module` errors that are not defects in anything.
//
// WHY IT LIVES IN `types/` AND NOT IN `src/`, WHICH IS WHERE IT BELONGS BY EVERY OTHER MEASURE.
// The root `prebuild` runs `clean:src`, which is
//
//     find packages -name node_modules -prune -o -path '*/src/*' \( -name '*.js' -o -name '*.d.ts'
//       -o -name '*.js.map' -o -name '*.d.ts.map' \) -exec rm -f {} +
//
// — a sweep of EMITTED artifacts out of every package's `src`, and it cannot tell an emitted
// declaration from a hand-written one. Put this file in `src/` and the next `npm run build` at the
// repository root deletes it, silently, and the five errors come back looking like a new problem.
// That happened twice before the cause was found. Anything hand-written with a `.d.ts` extension
// has to live outside `*/src/*` for as long as that sweep exists.
//
// DECLARED AS `unknown` AND NOT `any`, which is the point of writing it by hand. Every one of these
// is passed straight to Marko's own `.mount(...)`, so no axis reads a member off it; `any` would
// additionally switch off checking at each of those call sites and would hide a real mistake there.
// `unknown` says "this module exists and this checker knows nothing about its shape", which is
// exactly true.
declare module '*.marko' {
    const template: unknown;
    export default template;
}
