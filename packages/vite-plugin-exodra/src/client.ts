/**
 * Exodra HMR Client Runtime
 * Handles component updates while preserving state
 */

import type { TExoSchema } from '@exodra/core';

interface ComponentState {
  props: Record<string, unknown>;
  state: Record<string, unknown>;
  context: Record<string, unknown>;
}

interface HMRModule {
  default?: TExoSchema | (() => TExoSchema);
}

interface ExoHmrInstance {
  component: TExoSchema | (() => TExoSchema);
  element: HTMLElement;
  props: Record<string, unknown>;
  state: Record<string, unknown>;
  getState?: () => Record<string, unknown>;
  setState: (newState: Record<string, unknown>) => void;
  forceUpdate: () => void;
  context?: Record<string, unknown>;
}

interface ExoHmrElement extends Element {
  __exodra_instance?: ExoHmrInstance;
}

interface HMRContext {
  components: Map<string, ComponentState>;
  updateComponent: (id: string, newModule: HMRModule) => void;
  preserveState: (id: string) => ComponentState | undefined;
  restoreState: (id: string, state: ComponentState) => void;
}

interface ExoRouter {
  updateRoutes?: (routes: unknown) => Promise<void> | void;
}

declare global {
  interface Window {
    __EXODRA_HMR__?: HMRContext;
    __EXODRA_ROUTER__?: ExoRouter;
  }
}

/**
 * Initialize HMR runtime
 */
export function initHMR() {
  if (typeof window === 'undefined') return;
  
  if (window.__EXODRA_HMR__) return;
  
  const components = new Map<string, ComponentState>();
  
  window.__EXODRA_HMR__ = {
    components,
    
    updateComponent(id: string, newModule: HMRModule) {
      // Preserve current state
      const state = this.preserveState(id);

      // Find all mounted instances of this component
      const instances = document.querySelectorAll(`[data-exodra-id="${id}"]`);

      instances.forEach((element) => {
        // Get component instance
        const instance = (element as ExoHmrElement).__exodra_instance;
        if (!instance) return;
        
        // Update component definition
        if (newModule.default) {
          instance.component = newModule.default;
        }
        
        // Trigger re-render while preserving state
        if (state) {
          instance.setState(state.state);
        }
        
        instance.forceUpdate();
      });
      
      console.log(`[Exodra HMR] Component ${id} updated`);
    },
    
    preserveState(id: string): ComponentState | undefined {
      const element = document.querySelector(`[data-exodra-id="${id}"]`);
      if (!element) return;

      const instance = (element as ExoHmrElement).__exodra_instance;
      if (!instance) return;

      return {
        props: instance.props || {},
        state: instance.getState?.() || {},
        context: instance.context || {}
      };
    },
    
    restoreState(id: string, state: ComponentState) {
      const element = document.querySelector(`[data-exodra-id="${id}"]`);
      if (!element) return;

      const instance = (element as ExoHmrElement).__exodra_instance;
      if (!instance) return;

      if (state.state && instance.setState) {
        instance.setState(state.state);
      }
    }
  };
  
  // Listen for custom HMR events
  if (import.meta.hot) {
    import.meta.hot.on('exodra:component-update', (data) => {
      console.log('[Exodra HMR] Component update:', data);
    });
    
    import.meta.hot.on('exodra:route-update', async (data) => {
      console.log('[Exodra HMR] Routes updated:', data);
      
      // Dynamically update router
      const router = window.__EXODRA_ROUTER__;
      if (router && router.updateRoutes) {
        await router.updateRoutes((data as { routes?: unknown }).routes);
      } else {
        // Full reload if router doesn't support dynamic updates
        location.reload();
      }
    });
  }
}

/**
 * HMR-aware mount function
 */
export function hmrMount(
  component: TExoSchema | (() => TExoSchema),
  element: HTMLElement,
  id?: string
) {
  initHMR();
  
  // Add component ID for HMR tracking
  if (id) {
    element.setAttribute('data-exodra-id', id);
  }
  
  // Store instance reference
  const instance: ExoHmrInstance = {
    component,
    element,
    props: {},
    state: {},
    getState: () => instance.state,
    setState: (newState: Record<string, unknown>) => {
      instance.state = { ...instance.state, ...newState };
      instance.forceUpdate();
    },
    forceUpdate: () => {
      // Re-render component
      render();
    }
  };
  
  (element as ExoHmrElement).__exodra_instance = instance;
  
  // Initial render
  function render() {
    // Import actual mount from @exodra/dom
    import('@exodra/dom').then(({ mount }) => {
      mount(
        typeof component === 'function' ? component() : component,
        element
      );
    });
  }
  
  render();
  
  return instance;
}