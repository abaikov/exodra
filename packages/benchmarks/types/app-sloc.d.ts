// `virtual:app-sloc` — HOW MANY LINES OF CODE EACH APP FILE HOLDS, computed in Node while Vite
// serves the page and handed to the browser as a module. The plugin that produces it is
// `appSloc()` in `vite.config.ts`; the counter it calls is `scripts/app-sloc.mjs`.
//
// KEYED BY THE PATHS `src/benchmarks/app-files.ts` LISTS, package-relative, exactly as written
// there — so a reader can take a key out of the JSON and open the file.
//
// A VALUE IS `null` WHEN THE COUNTER COULD NOT READ THAT FILE, and never a zero. A participant with
// a `null` in its list gets no number and its row prints `—`; a zero would print as the leanest
// participant in the table.
//
// WHY IT LIVES IN `types/` AND NOT IN `src/`: the root `prebuild` sweeps every `*/src/*` of
// `.d.ts` files and cannot tell an emitted declaration from a hand-written one — see the header of
// `marko-modules.d.ts`, which is here for the same reason.
declare module 'virtual:app-sloc' {
    const counted: Readonly<Record<string, number | null>>;
    export default counted;
}
