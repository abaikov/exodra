import { describe, expect, it, beforeEach } from 'vitest';
import { bindable } from './bindable';
import { list } from './list';
import { createPersistor, persist, getPersistor } from './persistor';

describe('Persistor', () => {
    beforeEach(() => {
        // Clear global persistor between tests
        getPersistor().clear();
    });

    it('registers and serializes bindables', () => {
        const persistor = createPersistor();
        
        const name = bindable('John');
        const age = bindable(30);
        
        persistor.register(name, 'name');
        persistor.register(age, 'age');
        
        const json = persistor.serialize();
        const state = JSON.parse(json);
        
        expect(state).toEqual({
            name: 'John',
            age: 30
        });
    });
    
    it('auto-generates keys based on registration order', () => {
        const persistor = createPersistor();
        
        const first = bindable('first');
        const second = bindable('second');
        
        persistor.register(first); // auto key: _0
        persistor.register(second); // auto key: _1
        
        const json = persistor.serialize();
        const state = JSON.parse(json);
        
        expect(state).toEqual({
            _0: 'first',
            _1: 'second'
        });
    });
    
    it('registers and serializes lists', () => {
        const persistor = createPersistor();
        
        const items = list(['a', 'b', 'c']);
        
        persistor.register(items, 'items');
        
        const json = persistor.serialize();
        const state = JSON.parse(json);
        
        expect(state).toEqual({
            items: ['a', 'b', 'c']
        });
    });
    
    it('hydrates bindables from JSON', () => {
        const persistor = createPersistor();
        
        const name = bindable('initial');
        const age = bindable(0);
        
        persistor.register(name, 'name');
        persistor.register(age, 'age');
        
        // Simulate SSR state
        const ssrState = JSON.stringify({
            name: 'John',
            age: 30
        });
        
        persistor.hydrate(ssrState);
        
        expect(name.getValue()).toBe('John');
        expect(age.getValue()).toBe(30);
    });
    
    it('hydrates lists from JSON', () => {
        const persistor = createPersistor();
        
        const items = list(['initial']);
        
        persistor.register(items, 'items');
        
        const ssrState = JSON.stringify({
            items: ['a', 'b', 'c']
        });
        
        persistor.hydrate(ssrState);
        
        expect(items.snapshot()).toEqual(['a', 'b', 'c']);
    });
    
    it('persist helper auto-registers with global persistor', () => {
        persist(bindable('John'), 'name');
        persist(list([1, 2, 3]));
        
        const json = getPersistor().serialize();
        const state = JSON.parse(json);
        
        expect(state.name).toBe('John');
        expect(state._0).toEqual([1, 2, 3]); // auto-generated key
    });
    
    it('handles SSR workflow', () => {
        // Server side
        const serverPersistor = createPersistor();
        
        const counter = bindable(42);
        const todos = list(['Buy milk', 'Write code']);
        
        serverPersistor.register(counter, 'counter');
        serverPersistor.register(todos, 'todos');
        
        const ssrJson = serverPersistor.serialize();
        
        // Client side
        const clientPersistor = createPersistor();
        
        const clientCounter = bindable(0); // Initial client value
        const clientTodos = list([]); // Empty initially
        
        clientPersistor.register(clientCounter, 'counter');
        clientPersistor.register(clientTodos, 'todos');
        
        // Hydrate from SSR
        clientPersistor.hydrate(ssrJson);
        
        expect(clientCounter.getValue()).toBe(42);
        expect(clientTodos.snapshot()).toEqual(['Buy milk', 'Write code']);
    });
});