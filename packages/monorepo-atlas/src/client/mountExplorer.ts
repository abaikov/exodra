import { mount } from '@exodra/dom';
import { createExplorer } from '../view/explorer';
import { createViewState, fitViewport } from '../view/viewState';
import {
    applyColors,
    resolveMode,
    warnAboutColors,
    type TExoColors,
} from '../theme/applyPalette';
import { defaultPalette } from '../theme/palettes';
import type { TExoGraphModel } from '../model/types';
import type { TExoGraphLayout } from '../layout/types';

export type TExoExplorerData = {
    model: TExoGraphModel;
    layout: TExoGraphLayout;
};

export type TExoMountOptions = {
    /**
     * Load what is inside a package — its classes, functions and types, and how
     * they reach each other. Called when the reader asks for it, not up front:
     * measured on this repository, shipping every package's internals costs
     * 82 kB gzipped, against 5 kB for the package graph plus 4 kB for the one
     * package somebody actually opens.
     */
    loadPackage?: (id: string) => Promise<TExoExplorerData | undefined>;
    /** Which packages have an inside worth opening. */
    hasPackage?: (id: string) => boolean;
    /**
     * The host's palette. Everything is optional; what is left out keeps the
     * built-in value.
     *
     * A host whose colours are already CSS variables should skip this and set
     * the `--exo-*` properties in its own stylesheet instead — same effect, one
     * less thing to keep in sync, and it survives a page that swaps themes
     * without telling anyone.
     */
    colors?: TExoColors;
    /**
     * Warn in the console when the supplied colours fail the readability checks
     * (two node kinds indistinguishable, a colour lost against the background).
     * Defaults to on; turn it off in production builds.
     */
    checkColors?: boolean;
};

/**
 * Attach the explorer to an element.
 *
 * The page may already contain the server-rendered picture; this replaces it
 * with the interactive tree, which is a different shape (it gains a toolbar and
 * a detail panel). Hydration matches an existing tree — pretending this one
 * matches would be a lie that surfaces later as a subtle mismatch.
 */
export function mountExplorer(
    element: HTMLElement,
    data: TExoExplorerData,
    options: TExoMountOptions = {}
): { dispose(): void } {
    let mounted: { dispose(): void } | undefined;
    let root: HTMLElement | null = null;
    let unwatchFocus: (() => void) | undefined;
    // Which package is open, so the address can say so. Undefined at the top.
    let opened: string | undefined;
    // Set while WE are writing the address, so the resulting hashchange is not
    // mistaken for the reader navigating.
    let writingHash = false;

    /**
     * Drilling in swaps the DATASET, so the tree is rebuilt rather than patched.
     * That is the honest response to "show me something else entirely" — and it
     * is a deliberate, once-in-a-while action, not the per-frame path the
     * fine-grained bindings exist for.
     */
    const render = (
        dataset: TExoExplorerData,
        title?: string,
        back?: () => void
    ): void => {
        mounted?.dispose();
        const state = createViewState({
            canOpen: id => (back ? false : (options.hasPackage?.(id) ?? false)),
            open: id => {
                void openPackage(id);
            },
            back,
            title,
        });
        element.replaceChildren();
        mounted = mount(
            createExplorer(dataset.model, dataset.layout, state),
            element
        );
        // The address follows the reader, so a diagram someone is looking at can
        // be sent to someone else. Only the two states worth sharing are kept:
        // which package is open, and which declaration is selected inside it.
        unwatchFocus?.();
        unwatchFocus = state.focus.onChange(() => {
            writeHash(opened, state.focus.getValue(), 'replace');
        });
        root = element.firstElementChild as HTMLElement | null;
        paint();

        // Start with the whole drawing in view. Measured from the real box, so
        // it is right whatever column the host put this in.
        const stage = root?.querySelector('.exo-graph-stage');
        if (stage) {
            const box = stage.getBoundingClientRect();
            if (box.width > 0 && box.height > 0) {
                state.viewport.setValue(fitViewport(dataset.layout, box));
            }
        }
    };

    const openPackage = async (
        id: string,
        focus?: string,
        history: 'push' | 'replace' = 'push'
    ): Promise<void> => {
        // Say that something is happening. A package's insides come over the
        // network; on a slow connection a double-click that shows nothing for a
        // second reads as a broken double-click, and gets repeated.
        const status = showStatus(root, `Loading ${id}…`);
        try {
            const inside = await options.loadPackage?.(id);
            if (!inside) {
                status.fail(`Nothing published for ${id}`);
                return;
            }
            // On success the tree is rebuilt, which takes the notice with it.
            opened = id;
            render(inside, id, () => {
                opened = undefined;
                render(data);
                writeHash(undefined, null, 'push');
            });
            writeHash(id, focus ?? null, history);
            if (focus) focusById(focus);
        } catch {
            status.fail(`Could not load ${id}`);
        }
    };

    const paint = (): void => {
        if (!root || !options.colors) return;
        const mode = resolveMode(document.documentElement, prefersDark());
        applyColors(root, options.colors, mode);
        if (options.checkColors !== false) {
            warnAboutColors(options.colors, mode, {
                ...defaultPalette(mode),
                ...options.colors[mode],
                kind: {
                    ...defaultPalette(mode).kind,
                    ...options.colors[mode]?.kind,
                },
            });
        }
    };
    render(data);

    /** Put the reader where the address says, if it says anything. */
    const restore = (history: 'push' | 'replace'): void => {
        const target = readHash();
        if (!target) return;
        if (target.open === opened) {
            focusById(target.focus ?? null);
            return;
        }
        if (target.open) {
            void openPackage(target.open, target.focus, history);
        }
    };
    restore('replace');

    // The reader's Back button, and anyone editing the address by hand.
    const onHashChange = (): void => {
        if (writingHash) return;
        const target = readHash();
        if (!target && opened) {
            opened = undefined;
            render(data);
            return;
        }
        restore('replace');
    };
    window.addEventListener('hashchange', onHashChange);

    // The host page can change mode under us — a docs theme toggle stamps
    // `data-theme` on <html>, and the OS setting can flip at any time. Both mean
    // a different set of the host's colours now applies.
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener?.('change', paint);
    const observer = new MutationObserver(paint);
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
    });

    return {
        dispose() {
            media?.removeEventListener?.('change', paint);
            window.removeEventListener('hashchange', onHashChange);
            observer.disconnect();
            unwatchFocus?.();
            mounted?.dispose();
        },
    };

    function focusById(id: string | null): void {
        const node = root?.querySelector<HTMLElement>(
            id === null ? '.exo-graph-stage' : `[data-node="${cssEscape(id)}"]`
        );
        if (id !== null && !node) return;
        // Going through the DOM keeps this honest: the click path and the
        // address path end up in exactly the same state.
        node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }

    function writeHash(
        open: string | undefined,
        focus: string | null,
        history: 'push' | 'replace'
    ): void {
        const value = open
            ? focus
                ? `${open}:${focus}`
                : open
            : undefined;
        if (value && location.hash === `#${HASH_KEY}=${value}`) return;
        // With nothing of ours to record, the address is only cleared if what is
        // in it IS ours. A heading anchor the reader arrived on belongs to the
        // page, and selecting a box is no reason to throw it away.
        if (!value && !location.hash.startsWith(`#${HASH_KEY}=`)) return;
        const next = value
            ? `#${HASH_KEY}=${value}`
            : location.pathname + location.search;

        writingHash = true;
        try {
            if (history === 'push') window.history.pushState(null, '', next);
            else window.history.replaceState(null, '', next);
        } finally {
            // The address bar is never worth throwing an error over.
            setTimeout(() => {
                writingHash = false;
            }, 0);
        }
    }
}

const prefersDark = (): boolean =>
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

/**
 * A short-lived notice over the drawing.
 *
 * Plain DOM rather than part of the reactive tree: it belongs to the moment
 * BETWEEN two trees — the one being left and the one being fetched — and the
 * tree it would have to live in is the one about to be thrown away.
 */
function showStatus(
    root: HTMLElement | null,
    message: string
): { fail(text: string): void } {
    const stage = root?.querySelector('.exo-graph-stage');
    const element = root?.ownerDocument.createElement('div');
    if (stage && element) {
        element.className = 'exo-graph-status';
        // Announced to a screen reader, which cannot see the spinner.
        element.setAttribute('role', 'status');
        element.innerHTML = '<span class="exo-graph-spinner"></span>';
        element.append(message);
        stage.append(element);
    }

    return {
        fail(text: string) {
            if (!element) return;
            element.className = 'exo-graph-status exo-graph-status--error';
            element.replaceChildren(text);
            // Long enough to read, not so long that it becomes furniture.
            setTimeout(() => element.remove(), 6000);
        },
    };
}

/**
 * The one query key this puts in the address: `#atlas=@scope/pkg:Declaration`.
 *
 * Namespaced because the hash belongs to the PAGE, not to us — a docs site uses
 * it for heading anchors, and anything that does not start with this key is
 * somebody else's and is left alone.
 */
const HASH_KEY = 'atlas';

function readHash(): { open: string; focus?: string } | undefined {
    const raw = location.hash.replace(/^#/, '');
    if (!raw.startsWith(`${HASH_KEY}=`)) return undefined;

    const value = decodeURIComponent(raw.slice(HASH_KEY.length + 1));
    if (!value) return undefined;
    // A package name can contain a slash but not a colon, so the last colon
    // separates the declaration — `@exodra/dom:ExoNodeDom`.
    const cut = value.lastIndexOf(':');
    return cut === -1
        ? { open: value }
        : { open: value.slice(0, cut), focus: value.slice(cut + 1) };
}

/** Quote a name for use inside an attribute selector. */
function cssEscape(value: string): string {
    return CSS?.escape ? CSS.escape(value) : value.replace(/["\\]/g, '\\$&');
}
