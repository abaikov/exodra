import { ExoDomBackend, withExoCompiler, withExoHydration } from '@exodra/dom';
import { APP } from './app';

// NOT RUN IN A BROWSER SINCE THIS FILE WAS REWRITTEN. It called a free `hydrateExoRows(APP, root)`,
// which no longer exists.
//
// HYDRATION IS A PLUGIN, NOT AN ENTRY POINT. `backend.hydrate` exists only on a backend composed with
// `withExoHydration`, and that is enforced by the type: the decorator declares its contribution in
// its return type (`TBase & TExoHydrationApi`), so calling `hydrate` on a backend composed without
// it is a compile error rather than a call landing on `undefined` inside a render. A PACK IS A
// UNARY DECORATOR and no longer a constructor argument — composition is nesting,
// `withExoHydration(withExoCompiler(new ExoDomBackend()))` — and the decorator MUTATES and returns
// the object it is handed, so a chain is still ONE object and still one schema-cache key. It is a
// plugin because a value import of the hydration path from a module every client render reaches
// would weld it — the walk, the adopters, the shape checks, 3.2 kB gzipped — into every client-only
// bundle; composed, it is paid for only by the pages that name it.
//
// ONE BACKEND, AT MODULE LEVEL, and one object for both entry points. A backend is the schema cache
// key, compared by POINTER, so one built per call recompiles every schema. More to the point here:
// `render` and `hydrate` run against the SAME composition. When they were two free functions each
// taking their own composition argument, an application could compose one thing for the client and
// silently get the shipped default on a server-rendered page — nothing threw, and the wrong
// reconciler owned every adopted region from then on.
const backend = withExoHydration(withExoCompiler(new ExoDomBackend()));

// The element handed over is the CONTAINER; the instance the server rendered is its first ELEMENT
// child. The return value is the disposer for the adopted instance; this page never tears down.
const root = document.getElementById('app');
if (root) {
    backend.hydrate(APP, root);
}
