import { h, type TExoContext, type TExoSchema } from '@exodra/core';
import type { TExoRouteComponent } from './types';

/**
 * Layout wrapper component - wraps page content with a layout
 */
export function LayoutWrapper(context: TExoContext): TExoSchema | readonly TExoSchema[] {
    const layout = context.getConstant('layout') as TExoRouteComponent | undefined;
    const children = context.getConstant('children') as TExoSchema | readonly TExoSchema[];
    
    if (!layout) {
        return children || [];
    }
    
    // If layout is a component function, render it with outlet slot
    if (typeof layout === 'function' && layout.length > 0) {
        // Create a context with outlet as children
        return h(layout as unknown as TExoSchema['type'], {
            static: {
                outlet: children
            }
        });
    }
    
    // If layout is a schema, use it directly
    return layout as TExoSchema | readonly TExoSchema[];
}

/**
 * Error boundary component - catches errors in child components
 */
export function ErrorBoundary(context: TExoContext): TExoSchema | readonly TExoSchema[] {
    const children = context.getConstant('children') as TExoSchema | readonly TExoSchema[];

    // For now, just render children. Real error handling would require
    // try/catch during rendering which needs core support
    // TODO: Implement proper error boundary in core
    return children || [];
}