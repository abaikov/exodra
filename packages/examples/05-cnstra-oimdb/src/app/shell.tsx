import { derive } from '@exodra/reactivity';
import type { TExoSchema } from '@exodra/core';
import type { TExoBindable } from '@exodra/reactivity';
import type { TExoRouter } from '@exodra/router';
import { NAV } from './routes';
import type { WorkspaceRuntime } from './runtime';

// The persistent layout: sidebar nav (active link derived from router.location),
// a topbar with a live stat, an error banner bound to the CNS validation channel,
// and the #outlet element where lazily-loaded page chunks are mounted/swapped.
// Strict JSX: every prop is in a bucket — no flat attributes.
// The outlet is always rendered EMPTY here. On the server the matched page is
// rendered separately and spliced into it; on the client the shell and the page
// are hydrated as two independent trees, so a page can be disposed + swapped on
// navigation without touching the shell. (No SSR-DOM teardown — real hydration.)
export function shellView(
    router: TExoRouter,
    rt: WorkspaceRuntime,
    stats: TExoBindable<string, unknown>
): TExoSchema {
    return (
        <div static={{ class: 'app' }}>
            <aside static={{ class: 'sidebar' }}>
                <div static={{ class: 'brand' }}>
                    <span static={{ class: 'brand__dot' }} />
                    Exodra <span static={{ class: 'brand__sub' }}>Workspace</span>
                </div>
                <nav static={{ class: 'nav' }}>
                    {NAV.map(item => {
                        const cls = derive(router.location, loc =>
                            loc.pathname === item.path
                                ? 'nav__link nav__link--active'
                                : 'nav__link'
                        );
                        return (
                            <a
                                static={{ href: item.path }}
                                bindable={{ class: cls }}
                                handlers={{
                                    onClick: (e: Event) => {
                                        e.preventDefault();
                                        void router.navigate(item.path);
                                    },
                                }}
                            >
                                <span static={{ class: 'nav__icon' }}>
                                    {item.icon}
                                </span>
                                <span static={{ class: 'nav__label' }}>
                                    {item.label}
                                </span>
                            </a>
                        );
                    })}
                </nav>
                <footer static={{ class: 'sidebar__foot' }}>
                    oimdb · cnstra · exodra
                    <br />
                    SSR + hydration + lazy chunks
                </footer>
            </aside>
            <div static={{ class: 'content' }}>
                <header static={{ class: 'topbar' }}>
                    <span
                        static={{ class: 'topbar__stat' }}
                        bindable={{ textContent: stats }}
                    />
                    <span static={{ class: 'topbar__hint' }}>
                        every page is its own lazy chunk over one shared core
                    </span>
                </header>
                <p
                    static={{ class: 'error', role: 'alert' }}
                    bindable={{ textContent: rt.error }}
                />
                <main static={{ id: 'outlet', class: 'outlet' }} />
            </div>
        </div>
    );
}
