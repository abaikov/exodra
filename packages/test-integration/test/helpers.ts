import { h } from '@exodra/core';
import type { TExoSchema } from '@exodra/core';

/**
 * Helper to create component with proper attribute buckets
 * Automatically organizes props into constants, bindables, and bindableLists
 */
export function hc(
    component: TExoSchema['type'],
    props?: Record<string, any>
): TExoSchema {
    if (!props) {
        return h(component, {});
    }
    
    const static: Record<string, any> = {};
    const bindables: Record<string, any> = {};
    const bindableLists: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(props)) {
        if (value && typeof value === 'object') {
            if ('getValue' in value && 'setValue' in value && 'subscribe' in value) {
                // It's a bindable
                bindables[key] = value;
            } else if ('snapshot' in value && 'subscribeOps' in value) {
                // It's a bindable list
                bindableLists[key] = value;
            } else {
                // Regular object, treat as constant
                constants[key] = value;
            }
        } else {
            // Primitive value, treat as constant
            constants[key] = value;
        }
    }
    
    const attrs: Record<string, any> = {};
    
    if (Object.keys(constants).length > 0) {
        attrs.static = constants;
    }
    
    if (Object.keys(bindables).length > 0) {
        attrs.bindables = bindables;
    }
    
    if (Object.keys(bindableLists).length > 0) {
        attrs.bindableLists = bindableLists;
    }
    
    return h(component as any, attrs);
}