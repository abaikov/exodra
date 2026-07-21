import { getPersistor, type TExoPersistor } from './persistor';

/**
 * Client-side hydration from window state
 */
export function hydrateFromWindow(
    windowKey = '__EXODRA_STATE__',
    persistor?: TExoPersistor
): void {
    const actualPersistor = persistor || getPersistor();
    
    // Get state from window
    const state = (window as unknown as Record<string, unknown>)[windowKey];
    if (!state) {
        console.warn(`No hydration state found at window.${windowKey}`);
        return;
    }
    
    // Hydrate persistor
    const json = typeof state === 'string' ? state : JSON.stringify(state);
    actualPersistor.hydrate(json);
}

/**
 * Client-side hydration from script tag
 */
export function hydrateFromScript(
    scriptId = '__EXODRA_PERSISTOR__',
    persistor?: TExoPersistor
): void {
    const actualPersistor = persistor || getPersistor();
    
    // Get script element
    const scriptEl = document.getElementById(scriptId);
    if (!scriptEl || !scriptEl.textContent) {
        console.warn(`No hydration script found with id: ${scriptId}`);
        return;
    }
    
    // Parse and hydrate
    try {
        actualPersistor.hydrate(scriptEl.textContent);
    } catch (err) {
        console.error('Failed to hydrate from script:', err);
    }
}

/**
 * Auto-hydrate on client startup
 * Tries both window and script tag methods
 */
export function autoHydrate(persistor?: TExoPersistor): void {
    // Check if we're in browser
    if (typeof window === 'undefined') {
        return;
    }
    
    const actualPersistor = persistor || getPersistor();
    
    // Try window first (faster)
    if ((window as unknown as Record<string, unknown>).__EXODRA_STATE__) {
        hydrateFromWindow('__EXODRA_STATE__', actualPersistor);
        return;
    }
    
    // Try script tag
    if (document.getElementById('__EXODRA_PERSISTOR__')) {
        hydrateFromScript('__EXODRA_PERSISTOR__', actualPersistor);
    }
}