import { describe, expect, it } from 'vitest';
import { bindable, list, createPersistor } from '@exodra/reactivity';
import { renderPersistorScript, renderHydrationScript, renderPersistorHydration } from './renderPersistorScript';

describe('renderPersistorScript', () => {
    it('renders script tag with serialized state', () => {
        const persistor = createPersistor();
        const counter = bindable(42);
        const items = list(['a', 'b']);
        
        persistor.register(counter, 'counter');
        persistor.register(items, 'items');
        
        const script = renderPersistorScript(persistor);
        
        expect(script).toContain('id="__EXODRA_PERSISTOR__"');
        expect(script).toContain('type="application/json"');
        expect(script).toContain('{"counter":42,"items":["a","b"]}');
    });
    
    it('returns empty string when no state to persist', () => {
        const persistor = createPersistor();
        
        const script = renderPersistorScript(persistor);
        
        expect(script).toBe('');
    });
    
    it('escapes script-breaking characters', () => {
        const persistor = createPersistor();
        const html = bindable('</script><div>XSS</div>');
        
        persistor.register(html, 'html');
        
        const script = renderPersistorScript(persistor);
        
        // Should escape < > / in the JSON content
        expect(script).toContain('\\u003C\\u002Fscript\\u003E');
        expect(script).toContain('\\u003Cdiv\\u003E');
        // The closing </script> tag is expected, but not in the JSON content
        expect(script.indexOf('</script>')).toBeGreaterThan(0);
        expect(script.indexOf('</script>')).toBe(script.lastIndexOf('</script>'));
        expect(script).not.toContain('"</script>"');
        expect(script).not.toContain('<div>');
    });
    
    it('adds nonce attribute when provided', () => {
        const persistor = createPersistor();
        const value = bindable('test');
        persistor.register(value, 'value');
        
        const script = renderPersistorScript(persistor, { nonce: 'abc123' });
        
        expect(script).toContain('nonce="abc123"');
    });
    
    it('uses custom id when provided', () => {
        const persistor = createPersistor();
        const value = bindable('test');
        persistor.register(value, 'value');
        
        const script = renderPersistorScript(persistor, { id: 'custom-state' });
        
        expect(script).toContain('id="custom-state"');
        expect(script).not.toContain('__EXODRA_PERSISTOR__');
    });
});

describe('renderHydrationScript', () => {
    it('renders inline script for hydration', () => {
        const script = renderHydrationScript();
        
        expect(script).toContain('<script >');
        expect(script).toContain('document.getElementById(\'__EXODRA_PERSISTOR__\')');
        expect(script).toContain('window.__EXODRA_STATE__');
        expect(script).toContain('JSON.parse(el.textContent)');
    });
    
    it('uses custom id and variable name', () => {
        const script = renderHydrationScript({
            id: 'my-state',
            variableName: 'window.APP_STATE'
        });
        
        expect(script).toContain('document.getElementById(\'my-state\')');
        expect(script).toContain('window.APP_STATE = JSON.parse');
    });
    
    it('adds nonce attribute when provided', () => {
        const script = renderHydrationScript({ nonce: 'xyz789' });
        
        expect(script).toContain('nonce="xyz789"');
    });
});

describe('renderPersistorHydration', () => {
    it('renders both persistor state and hydration script', () => {
        const persistor = createPersistor();
        const value = bindable('test');
        persistor.register(value, 'value');
        
        const combined = renderPersistorHydration(persistor);
        
        // Should contain both scripts
        expect(combined).toContain('id="__EXODRA_PERSISTOR__"');
        expect(combined).toContain('type="application/json"');
        expect(combined).toContain('{"value":"test"}');
        expect(combined).toContain('document.getElementById');
        expect(combined).toContain('window.__EXODRA_STATE__');
    });
    
    it('returns only hydration script when no state', () => {
        const persistor = createPersistor();
        
        const combined = renderPersistorHydration(persistor);
        
        // Should only have hydration script
        expect(combined).not.toContain('type="application/json"');
        expect(combined).toContain('document.getElementById');
    });
    
    it('passes options to both functions', () => {
        const persistor = createPersistor();
        const value = bindable('test');
        persistor.register(value, 'value');
        
        const combined = renderPersistorHydration(persistor, {
            id: 'app-state',
            variableName: 'globalState',
            nonce: 'secure123'
        });
        
        expect(combined).toContain('id="app-state"');
        expect(combined).toContain('globalState = JSON.parse');
        expect(combined).toContain('nonce="secure123"');
        // Should have nonce in both scripts
        expect(combined.match(/nonce="secure123"/g)?.length).toBe(2);
    });
});