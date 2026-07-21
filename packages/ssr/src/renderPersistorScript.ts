import type { TExoPersistor } from '@exodra/reactivity';

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
    
    const id = options.id || '__EXODRA_PERSISTOR__';
    
    const scriptAttrs = [
        `id="${id}"`,
        'type="application/json"'
    ];
    
    if (options.nonce) {
        scriptAttrs.push(`nonce="${options.nonce}"`);
    }
    
    // Store as JSON in a script tag
    return `<script ${scriptAttrs.join(' ')}>${escapeScriptContent(json)}</script>`;
}

/**
 * Renders inline script to auto-hydrate persistor on client
 */
export function renderHydrationScript(options: TExoPersistorScriptOptions = {}): string {
    const id = options.id || '__EXODRA_PERSISTOR__';
    const varName = options.variableName || 'window.__EXODRA_STATE__';
    
    const script = `
(function() {
    var el = document.getElementById('${id}');
    if (el && el.textContent) {
        ${varName} = JSON.parse(el.textContent);
    }
})();`;
    
    const scriptAttrs = options.nonce ? `nonce="${options.nonce}"` : '';
    
    return `<script ${scriptAttrs}>${script}</script>`;
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

function escapeScriptContent(content: string): string {
    return content
        .replace(/</g, '\\u003C')
        .replace(/>/g, '\\u003E')
        .replace(/\//g, '\\u002F');
}