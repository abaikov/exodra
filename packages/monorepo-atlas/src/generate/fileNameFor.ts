/**
 * A package name as a file name: `@exodra/dom` → `exodra__dom`.
 *
 * The one place that knows how a package name becomes a file under `insides/`. The CLI writes
 * those files and anything that reads them resolves their names through here, so the two cannot
 * drift.
 */
export function fileNameFor(id: string): string {
    return id.replace(/^@/, '').replace(/[/\\]/g, '__');
}
