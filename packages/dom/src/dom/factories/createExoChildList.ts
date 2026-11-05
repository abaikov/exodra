import { dropExoChild } from '../dropExoChild';
import { exoNodeDom } from '../exoNodeDom';
import type { TExoNode } from '@exodra/core';
import type { TExoDomMark } from '../types/TExoDomMark';
import type { TExoDomChild } from '../types/TExoDomChild';
import type { TExoChildList } from '../types/TExoChildList';
import type { TExoChildListOwner } from '../types/TExoChildListOwner';

// A caller that holds this copies it.
const NOBODY: readonly TExoNode<TExoDomMark>[] = [];

// All seven fields are written in the ONE constructor: an object grown after construction spills out
// of its in-object property store.
class ExoChildList implements TExoChildList {
    private readonly parent: Element;
    // `openChildList` published this very array to the neighbour child list in front, which reads
    // `order[0].node` to find where it ends — so it is emptied in place and never handed out.
    private readonly order: TExoDomChild[];
    private readonly chain: (() => Node | null) | null;
    private readonly fixed: Node | null;
    private readonly ownsParent: boolean;
    private served: (Element | null)[] | null;
    private readonly owner: TExoChildListOwner | null;

    constructor(
        parent: Element,
        order: TExoDomChild[],
        end: Node | null | (() => Node | null),
        ownsParent: boolean,
        served: Element[] | null,
        owner: TExoChildListOwner | null
    ) {
        const chain = typeof end === 'function' ? end : null;
        this.parent = parent;
        this.order = order;
        this.chain = chain;
        this.fixed = chain === null ? (end as Node | null) : null;
        this.ownsParent = ownsParent;
        this.served = served;
        this.owner = owner;
    }

    takeServed(at: number): Element | null {
        const served = this.served;
        if (served === null || at >= served.length) return null;
        const element = served[at];
        served[at] = null;
        return element;
    }

    dropUnclaimedServed(): void {
        const served = this.served;
        if (served === null) return;
        this.served = null;
        for (let i = 0; i < served.length; i++) {
            const element = served[i];
            if (element !== null) element.remove();
        }
    }

    private materialize(dom: TExoDomChild, at: number): void {
        const owner = this.owner;
        if (owner !== null) owner.materializeExoChild(dom, this, at);
    }

    private anchorAt(i: number): Node | null {
        const order = this.order;
        const chain = this.chain;
        let at = i < order.length ? order[i].node : chain === null ? this.fixed : chain();
        const parent = this.parent;
        while (at !== null && at.parentNode !== parent) at = at.parentNode;
        return at;
    }

    get size(): number {
        return this.order.length;
    }

    at(i: number): TExoNode<TExoDomMark> | undefined {
        return this.order[i] as unknown as TExoNode<TExoDomMark> | undefined;
    }

    insert(child: TExoNode<TExoDomMark>, i?: number): void {
        const order = this.order;
        // CHECKED, not cast: a bare `Element` handed in here carries no lifecycle, and without this
        // the page gets `appendChild: parameter 1 is not of type 'Node'` from inside a placement.
        const had = order.length;
        const to = i === undefined || i > had ? had : i;
        const pending = child as unknown as TExoDomChild;
        if (pending.node === undefined && pending.machine != null) this.materialize(pending, to);
        const dom = exoNodeDom(child);
        const node = dom.node as Element;
        const at = this.anchorAt(to);
        if (at === null) this.parent.appendChild(node);
        else this.parent.insertBefore(node, at);
        if (to === had) order.push(dom);
        else order.splice(to, 0, dom);
        dom.placedIn = this;
        dom.mount();
    }

    move(from: number, to: number): void {
        if (from === to) return;
        const order = this.order;
        const parent = this.parent;
        const dom = order[from];
        // No tail fast path on either splice: a move is not a tail command in any scene measured.
        order.splice(from, 1);
        let moving: Node | null = dom.node;
        while (moving !== null && moving.parentNode !== parent) moving = moving.parentNode;
        if (moving === null) moving = dom.node;
        const at = this.anchorAt(to);
        if (at === null) parent.appendChild(moving);
        else parent.insertBefore(moving, at);
        order.splice(to, 0, dom);
        // No `mount`/`unmount`: the child never left the tree.
    }

    remove(i: number): void {
        const order = this.order;
        const last = order.length - 1;
        const dom = order[i];
        dropExoChild(dom, this.parent);
        dom.placedIn = null;
        if (i === last) order.pop();
        else order.splice(i, 1);
    }

    removeAll(): void {
        const order = this.order;
        const had = order.length;
        if (had === 0) return;
        // THE TWO PASSES ARE THE POINT. Everything is told while the list is whole, and only then
        // does anything leave; `dropExoChild` in a loop would tell the last child about a list that
        // no longer has its neighbours in it.
        for (let i = 0; i < had; i++) {
            const dom = order[i];
            dom.unmount();
            dom.placedIn = null;
        }
        const parent = this.parent;
        if (this.ownsParent) {
            parent.textContent = '';
        } else {
            for (let i = had - 1; i >= 0; i--) {
                const dom = order[i];
                let out: Node | null = dom.node;
                while (out !== null && out.parentNode !== parent) out = out.parentNode;
                if (out !== null) parent.removeChild(out);
            }
        }
        order.length = 0;
    }

    detach(i: number): TExoNode<TExoDomMark> | undefined {
        const order = this.order;
        // `| undefined` because `noUncheckedIndexedAccess` is off here, and without it the compare
        // below is rejected as having no overlap.
        const dom: TExoDomChild | undefined = order[i];
        if (dom === undefined) return undefined;
        const parent = this.parent;
        // The climb is needed because an extension or page translator reparents nodes under
        // wrappers, and `removeChild` throws.
        let out: Node | null = dom.node;
        while (out !== null && out.parentNode !== parent) out = out.parentNode;
        if (out !== null) parent.removeChild(out);
        // No `unmount`: nothing disposed, nothing struck off a registry, no element offered back to
        // a node source.
        order.splice(i, 1);
        dom.placedIn = null;
        return dom as unknown as TExoNode<TExoDomMark>;
    }

    detachAll(): readonly TExoNode<TExoDomMark>[] {
        const order = this.order;
        const parent = this.parent;
        const had = order.length;
        // Nothing there is nothing done, DOM call included: this must be callable speculatively.
        if (had === 0) return NOBODY;
        // A copy, and it has to be one: `order`'s identity is published to the child list chain.
        const taken = order.slice() as unknown as readonly TExoNode<TExoDomMark>[];
        for (let i = 0; i < had; i++) order[i].placedIn = null;
        if (this.ownsParent) {
            // Legal only because the port is its element's ONLY child — it takes anything else in
            // the parent with it, which is why the flag may not be widened.
            parent.textContent = '';
        } else {
            // A list among static siblings may not touch anything it does not hold. From the end
            // downwards: the last child is the cheaper `removeChild` on engines that keep a list.
            for (let i = had - 1; i >= 0; i--) {
                const dom = order[i];
                let out: Node | null = dom.node;
                while (out !== null && out.parentNode !== parent) out = out.parentNode;
                if (out !== null) parent.removeChild(out);
            }
        }
        order.length = 0;
        return taken;
    }

    attach(child: TExoNode<TExoDomMark>, i?: number): void {
        const order = this.order;
        const had = order.length;
        const to = i === undefined || i > had ? had : i;
        const pending = child as unknown as TExoDomChild;
        if (pending.node === undefined && pending.machine != null) this.materialize(pending, to);
        const dom = exoNodeDom(child);
        const node = dom.node as Element;
        const at = this.anchorAt(to);
        if (at === null) this.parent.appendChild(node);
        else this.parent.insertBefore(node, at);
        order.splice(to, 0, dom);
        dom.placedIn = this;
        // No `mount()`. That is the entire difference from `insert`.
    }

    indexOf(child: TExoNode<TExoDomMark>): number {
        return this.order.indexOf(child as unknown as TExoDomChild);
    }
}

// Indices are not validated beyond clamping an insert to the end; past the end `move`/`remove`
// throw on the field access. Why `ownsParent` may not be derived at runtime: ../../README.md §
// Clearing a child list that owns its element.
export function createExoChildList(
    parent: Element,
    order: TExoDomChild[],
    end: Node | null | (() => Node | null),
    ownsParent: boolean,
    served: Element[] | null = null,
    owner: TExoChildListOwner | null = null
): TExoChildList {
    return new ExoChildList(parent, order, end, ownsParent, served, owner);
}
