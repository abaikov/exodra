import { mountExplorer, type TExoExplorerData, type TExoMountOptions } from './mountExplorer';

/**
 * Mount from published artefacts, given where they live.
 *
 * The one place that knows the file layout the CLI writes — the self-booting
 * script and any host that mounts by hand both go through here, so the two
 * cannot drift about where `insides/` sits or how a package name becomes a file
 * name.
 */
export async function mountFromUrl(
    element: HTMLElement,
    dataUrl: string,
    options: Omit<TExoMountOptions, 'loadPackage' | 'hasPackage'> = {}
): Promise<{ dispose(): void }> {
    const resolved = new URL(dataUrl, location.href);
    const base = new URL('.', resolved);

    const response = await fetch(resolved);
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    const data = (await response.json()) as TExoExplorerData;

    // Which packages have an inside worth opening. One small fetch up front;
    // the insides themselves only when a reader asks for one.
    let openable: string[] = [];
    try {
        const index = await fetch(new URL('insides/index.json', base));
        if (index.ok) openable = (await index.json()) as string[];
    } catch {
        // No insides published — the package graph still works on its own.
    }

    return mountExplorer(element, data, {
        ...options,
        hasPackage: id => openable.includes(id),
        loadPackage: async id => {
            const inside = await fetch(
                new URL(`insides/${fileNameFor(id)}.json`, base)
            );
            return inside.ok ? ((await inside.json()) as TExoExplorerData) : undefined;
        },
    });
}

/** A package name as a file name: `@exodra/dom` → `exodra__dom`. */
export function fileNameFor(id: string): string {
    return id.replace(/^@/, '').replace(/[/\\]/g, '__');
}
