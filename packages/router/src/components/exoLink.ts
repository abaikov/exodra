import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoWire,
    withExoHandlers,
    withExoEffects,
    createExoSchema,
    swapExoParams,
} from '@exodra/core';
import type { TExoAttrPort, TExoEventPort, TExoMachineNode, TExoTextPort } from '@exodra/core';
import { injectExoRouter } from '../setup/injectExoRouter';
import { isAbsoluteUrl } from '../path/isAbsoluteUrl';
import { parseExoPath } from '../path/parseExoPath';
import { shouldIgnoreExoLinkClick } from './shouldIgnoreExoLinkClick';
import type { TExoLinkParams, TExoLinkState } from '../types';

// A real `<a href>`, because the markup is what a crawler follows and what "open in a new tab"
// opens. The ATTRIBUTE carries `router.createHref`'s answer, so an app served under `/docs/`
// prints `/docs/about` while the table still says `/about`.
const LINK_SCHEMA = createExoSchema((b) => {
    let href!: TExoAttrPort;
    let target!: TExoAttrPort;
    let download!: TExoAttrPort;
    let current!: TExoAttrPort;
    let click!: TExoEventPort;
    let label!: TExoTextPort;
    b.el('a', null, (a) => {
        href = a.port('href');
        target = a.port('target');
        download = a.port('download');
        current = a.port('aria-current');
        click = a.eventPort('click');
        label = a.textPort();
    });
    return { href, target, download, current, click, label };
});
const P = LINK_SCHEMA.ports;

const mLink = createExoMachine<TExoMachineNode, TExoLinkParams, TExoLinkState>(LINK_SCHEMA, {
    createInitialState: (c): TExoLinkState => ({
        router: injectExoRouter(c),
        href: '',
        pathname: null,
    }),
});

export const ExoLink = composeExoMachine(
    mLink,
    (m) =>
        withExoTransitions(m, {
            showCurrent: (c) => {
                const params = c.serviceState as TExoLinkParams;
                const pathname = c.state.router.getLocation().pathname;
                if (pathname === c.state.pathname) return;
                c.state.pathname = pathname;
                c.attr(P.current, isCurrent(params, pathname) ? 'page' : undefined);
            },
        }),
    (m) =>
        withExoWire(m, (c, params) => {
            swapExoParams(c, params);
            const href = isAbsoluteUrl(params.to)
                ? params.to
                : c.state.router.createHref(params.to);
            c.state.href = href;
            c.attr(P.href, href);
            // `undefined` removes the attribute on the DOM and prints nothing on the server — the same
            // absence in both, which is what hydration compares.
            c.attr(P.target, params.target);
            c.attr(P.download, params.download);
            c.text(P.label, params.label);
            if (params.currentWhen !== undefined) {
                c.state.pathname = null;
                showCurrent(c);
            } else if (c.state.pathname !== null) {
                c.state.pathname = null;
                c.attr(P.current, undefined);
            }
        }),
    (m) =>
        withExoHandlers(m, (on) => {
            on(P.click, (c, event) => {
                const params = c.serviceState as TExoLinkParams;
                const mouse = event as MouseEvent;
                // FIRST, so a caller's handler can call the navigation off with `preventDefault()`.
                params.onClick?.(mouse);
                if (shouldIgnoreExoLinkClick(mouse, c.state.href, params.target, params.download))
                    return;
                mouse.preventDefault();
                void c.state.router.navigate(params.to, {
                    replace: params.replace,
                    state: params.state,
                });
            });
        }),
    (m) =>
        withExoEffects(m, (effect) => {
            effect((c) => {
                if ((c.serviceState as TExoLinkParams).currentWhen === undefined) return null;
                showCurrent(c);
                return c.state.router.onChange(() => showCurrent(c));
            });
        })
);
const { showCurrent } = ExoLink.transitions;

function isCurrent(params: TExoLinkParams, pathname: string): boolean {
    if (isAbsoluteUrl(params.to)) return false;
    const target = parseExoPath(params.to).pathname;
    if (pathname === target) return true;
    if (params.currentWhen !== 'prefix') return false;
    return pathname.startsWith(target === '/' ? '/' : `${target}/`);
}
