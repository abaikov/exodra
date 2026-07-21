// @vitest-environment jsdom

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { bindable } from './bindable';
import { list } from './list';
import { getPersistor } from './persistor';
import { hydrateFromWindow, hydrateFromScript, autoHydrate } from './hydrate';

describe('Hydrate', () => {
    beforeEach(() => {
        // Clear global persistor between tests
        getPersistor().clear();
        
        // Reset window state
        if (typeof window !== 'undefined') {
            delete (window as unknown as Record<string, unknown>).__EXODRA_STATE__;
        }
        
        // Clear any script tags
        if (typeof document !== 'undefined') {
            const scripts = document.querySelectorAll('#__EXODRA_PERSISTOR__');
            scripts.forEach(s => s.remove());
        }
    });
    
    describe('hydrateFromWindow', () => {
        it('hydrates from window.__EXODRA_STATE__', () => {
            const persistor = getPersistor();
            const counter = bindable(0);
            const items = list([]);
            
            persistor.register(counter, 'counter');
            persistor.register(items, 'items');
            
            // Simulate SSR state in window
            (window as unknown as Record<string, unknown>).__EXODRA_STATE__ = {
                counter: 42,
                items: ['a', 'b', 'c']
            };
            
            hydrateFromWindow();
            
            expect(counter.getValue()).toBe(42);
            expect(items.snapshot()).toEqual(['a', 'b', 'c']);
        });
        
        it('handles JSON string in window', () => {
            const persistor = getPersistor();
            const name = bindable('');
            
            persistor.register(name, 'name');
            
            // SSR state as JSON string
            (window as unknown as Record<string, unknown>).__EXODRA_STATE__ = JSON.stringify({ name: 'John' });
            
            hydrateFromWindow();
            
            expect(name.getValue()).toBe('John');
        });
        
        it('warns when no state found', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            
            hydrateFromWindow();
            
            expect(warnSpy).toHaveBeenCalledWith('No hydration state found at window.__EXODRA_STATE__');
            
            warnSpy.mockRestore();
        });
        
        it('uses custom window key', () => {
            const persistor = getPersistor();
            const value = bindable(0);
            
            persistor.register(value, 'value');
            
            (window as unknown as Record<string, unknown>).__CUSTOM_STATE__ = { value: 100 };
            
            hydrateFromWindow('__CUSTOM_STATE__');
            
            expect(value.getValue()).toBe(100);
        });
    });
    
    describe('hydrateFromScript', () => {
        it('hydrates from script tag', () => {
            const persistor = getPersistor();
            const counter = bindable(0);
            const items = list([]);
            
            persistor.register(counter, 'counter');
            persistor.register(items, 'items');
            
            // Create script tag with state
            const script = document.createElement('script');
            script.type = 'application/json';
            script.id = '__EXODRA_PERSISTOR__';
            script.textContent = JSON.stringify({
                counter: 42,
                items: ['x', 'y', 'z']
            });
            document.body.appendChild(script);
            
            hydrateFromScript();
            
            expect(counter.getValue()).toBe(42);
            expect(items.snapshot()).toEqual(['x', 'y', 'z']);
        });
        
        it('warns when script not found', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            
            hydrateFromScript();
            
            expect(warnSpy).toHaveBeenCalledWith('No hydration script found with id: __EXODRA_PERSISTOR__');
            
            warnSpy.mockRestore();
        });
        
        it('handles parse errors', () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            
            const script = document.createElement('script');
            script.type = 'application/json';
            script.id = '__EXODRA_PERSISTOR__';
            script.textContent = 'invalid json {';
            document.body.appendChild(script);
            
            hydrateFromScript();
            
            expect(errorSpy).toHaveBeenCalledWith(
                'Failed to hydrate from script:',
                expect.any(Error)
            );
            
            errorSpy.mockRestore();
        });
        
        it('uses custom script id', () => {
            const persistor = getPersistor();
            const value = bindable('');
            
            persistor.register(value, 'value');
            
            const script = document.createElement('script');
            script.type = 'application/json';
            script.id = 'custom-state';
            script.textContent = JSON.stringify({ value: 'test' });
            document.body.appendChild(script);
            
            hydrateFromScript('custom-state');
            
            expect(value.getValue()).toBe('test');
        });
    });
    
    describe('autoHydrate', () => {
        it('prefers window state over script', () => {
            const persistor = getPersistor();
            const value = bindable(0);
            
            persistor.register(value, 'value');
            
            // Both window and script present
            (window as unknown as Record<string, unknown>).__EXODRA_STATE__ = { value: 100 };
            
            const script = document.createElement('script');
            script.type = 'application/json';
            script.id = '__EXODRA_PERSISTOR__';
            script.textContent = JSON.stringify({ value: 200 });
            document.body.appendChild(script);
            
            autoHydrate();
            
            // Should use window value
            expect(value.getValue()).toBe(100);
        });
        
        it('falls back to script when window not present', () => {
            const persistor = getPersistor();
            const value = bindable(0);
            
            persistor.register(value, 'value');
            
            const script = document.createElement('script');
            script.type = 'application/json';
            script.id = '__EXODRA_PERSISTOR__';
            script.textContent = JSON.stringify({ value: 300 });
            document.body.appendChild(script);
            
            autoHydrate();
            
            expect(value.getValue()).toBe(300);
        });
        
        it('does nothing when no state available', () => {
            const persistor = getPersistor();
            const value = bindable(10);
            
            persistor.register(value, 'value');
            
            autoHydrate();
            
            // Value should remain unchanged
            expect(value.getValue()).toBe(10);
        });
        
        it('uses custom persistor', async () => {
            const { createPersistor } = await import('./persistor');
            const customPersistor = createPersistor();
            const value = bindable(0);
            
            customPersistor.register(value, 'value');
            
            (window as unknown as Record<string, unknown>).__EXODRA_STATE__ = { value: 999 };
            
            autoHydrate(customPersistor);
            
            expect(value.getValue()).toBe(999);
        });
    });
});