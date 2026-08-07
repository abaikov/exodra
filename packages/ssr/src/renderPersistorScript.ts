import { escapeAttribute } from '@exodra/string';
import type { TExoPersistor } from '@exodra/reactivity';
import { renderJsonScript } from './renderJsonScript';

export interface TExoPersistorScriptOptions {
    id?: string;
    nonce?: string;
    variableName?: string;
}

/**
 * Renders a script tag with persistor state for hydration
 */
export function renderPersistorScript(
    persistor: TExoPersistor,
    options: TExoPersistorScriptOptions = {}
): string {
    const json = persistor.serialize();
    
    // Skip if no state to persist
    if (json === '{}') {
        return '';
    }
    
    // One emitter for both state channels — see renderJsonScript. This used to
    // build the tag by hand with unescaped attributes and its own escaper.
    return renderJsonScript(json, {
        id: options.id || '__EXODRA_PERSISTOR__',
        nonce: options.nonce,
    });
}

/**
 * Renders inline script to auto-hydrate persistor on client
 */
export function renderHydrationScript(options: TExoPersistorScriptOptions = {}): string {
    const id = options.id || '__EXODRA_PERSISTOR__';
    const varName = options.variableName || 'window.__EXODRA_STATE__';

    // `id` is interpolated into JS source, so it goes in as a JSON string literal
    // rather than inside hand-written quotes — an id containing a quote would
    // otherwise end the literal and inject whatever follows.
    const script = `
(function() {
    var el = document.getElementById(${JSON.stringify(id)});
    if (el && el.textContent) {
        ${varName} = JSON.parse(el.textContent);
    }
})();`;

    const nonce = options.nonce
        ? ` nonce="${escapeAttribute(options.nonce)}"`
        : '';

    return `<script${nonce}>${script}</script>`;
}

/**
 * Combined helper to render both persistor state and hydration script
 */
export function renderPersistorHydration(
    persistor: TExoPersistor,
    options: TExoPersistorScriptOptions = {}
): string {
    return renderPersistorScript(persistor, options) + 
           renderHydrationScript(options);
}
