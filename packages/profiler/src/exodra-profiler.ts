/**
 * Exodra-specific profiler that integrates with ExoNode
 * This replaces the old built-in profiling with external patching
 */

import type { ExoNode } from '@exodra/core';
import { profileClass } from './class-profiler';

// Re-export the old interface for compatibility
export interface TExoProfileMetrics {
    componentId: string;
    phase: 'init' | 'mount' | 'update' | 'unmount';
    duration: number;
    timestamp: number;
    depth: number;
    childCount: number;
}

export type TExoProfileCallback = (metrics: TExoProfileMetrics) => void;

/**
 * Enable profiling for ExoNode (compatibility layer)
 * This now patches the ExoNode class externally instead of using built-in profiling
 */
export function enableExoNodeProfiling(
    ExoNodeClass: typeof ExoNode,
    callback: TExoProfileCallback
): void {
    // Map method names to phases
    const methodToPhase: Record<string, TExoProfileMetrics['phase']> = {
        'init': 'init',
        'onInit': 'init',
        'dispose': 'unmount',
        'onDispose': 'unmount',
        'setChildren': 'update',
        'onChildrenChanged': 'update'
    };
    
    profileClass(ExoNodeClass, (metrics) => {
        const phase = methodToPhase[metrics.method];
        if (!phase) return; // Skip methods we don't care about
        
        // Extract node info (this requires the node instance)
        // Since we're patching the prototype, 'this' in the patched method is the node instance
        // But we don't have access to it here... need a different approach
        
        // For now, generate a simple component ID
        const componentId = `${metrics.className}-${Math.random().toString(36).slice(2, 8)}`;
        
        callback({
            componentId,
            phase,
            duration: metrics.duration,
            timestamp: metrics.timestamp,
            depth: 0, // Would need node instance to calculate
            childCount: 0 // Would need node instance to get
        });
    }, {
        methods: ['init', 'dispose', 'setChildren', 'onChildrenChanged']
    });
}

/**
 * Smarter profiling that extracts node information
 */
// Shape of the ExoNode prototype methods this profiler patches. `init` and
// `setChildren` are protected on ExoNode, so they are not visible on the public
// type; we describe them explicitly for the prototype-patching below.
type TExoNodePatchProto = {
    init(this: ExoNode): unknown;
    dispose(this: ExoNode): unknown;
    setChildren(this: ExoNode, newChildren: unknown): unknown;
};

export function profileExoNode(
    ExoNodeClass: typeof ExoNode,
    callback: TExoProfileCallback
): void {
    const proto = ExoNodeClass.prototype as unknown as TExoNodePatchProto;

    // Store original methods
    const originals = {
        init: proto.init,
        dispose: proto.dispose,
        setChildren: proto.setChildren
    };

    // Patch init
    proto.init = function(this: ExoNode) {
        const start = performance.now();
        const result = originals.init.call(this);
        const duration = performance.now() - start;
        
        callback({
            componentId: generateComponentId(this),
            phase: 'init',
            duration,
            timestamp: Date.now(),
            depth: calculateDepth(this),
            childCount: this.children.length
        });
        
        return result;
    };
    
    // Patch dispose
    proto.dispose = function(this: ExoNode) {
        const start = performance.now();
        const childCount = this.children.length;
        const result = originals.dispose.call(this);
        const duration = performance.now() - start;
        
        callback({
            componentId: generateComponentId(this),
            phase: 'unmount',
            duration,
            timestamp: Date.now(),
            depth: calculateDepth(this),
            childCount
        });
        
        return result;
    };
    
    // Patch setChildren
    proto.setChildren = function(this: ExoNode, newChildren: unknown) {
        const start = performance.now();
        const result = originals.setChildren.call(this, newChildren);
        const duration = performance.now() - start;
        
        callback({
            componentId: generateComponentId(this),
            phase: 'update',
            duration,
            timestamp: Date.now(),
            depth: calculateDepth(this),
            childCount: this.children.length
        });
        
        return result;
    };
}

function generateComponentId(node: ExoNode): string {
    const type = node.schema?.type;
    const typeStr =
        typeof type === 'string'
            ? type
            : typeof type === 'function'
              ? type.name || 'Component'
              : 'Unknown';
    // Use a WeakMap to store stable IDs per node instance
    return `${typeStr}-${getNodeId(node)}`;
}

// WeakMap to store stable IDs for each node
const nodeIds = new WeakMap<ExoNode, string>();
let idCounter = 0;

function getNodeId(node: ExoNode): string {
    if (!nodeIds.has(node)) {
        nodeIds.set(node, (++idCounter).toString(36));
    }
    return nodeIds.get(node)!;
}

// `parentNode` is protected on ExoNode; expose it for read-only traversal here.
type TExoNodeWithParent = { parentNode?: TExoNodeWithParent };

function calculateDepth(node: ExoNode): number {
    let depth = 0;
    let current = (node as unknown as TExoNodeWithParent).parentNode;
    while (current) {
        depth++;
        current = current.parentNode;
    }
    return depth;
}

// Deprecated compatibility layer - remove in next major version
export const ExoNodeCompat = {
    enableProfiling(_callback: TExoProfileCallback): void {
        console.warn('ExoNode.enableProfiling is deprecated. Import ExoNode class and use profileExoNode()');
    },
    
    disableProfiling(): void {
        console.warn('ExoNode.disableProfiling is deprecated. Profiling removal not supported with new approach');
    },
    
    isProfiling(): boolean {
        return false; // Always false now since there's no built-in profiling
    }
};