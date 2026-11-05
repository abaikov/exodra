// @vitest-environment jsdom
//
// AN ELEMENT THIS RENDERER DID NOT MAKE, PLACED LIKE ONE IT DID.
//
// `exoForeignNode` is the one door through which a hand-built element — or the root of another
// framework's render — becomes a child a children port can hold. The claim it has to keep is that
// from the list's side NOTHING FOREIGN IS HAPPENING: the element is placed in order, moved rather
// than rebuilt, dropped through the same `dropExoChild`, and swept by the same owned-child list clear as
// every child `exonode.createExoNode(...)` produces. So most of these cases are ordinary list cases with
// one foreign child standing in the middle of them, and they are written that way on purpose — a
// suite that exercised a foreign child ALONE would pass while the child was invisible to every
// path that has a neighbour.
//
// The cases that are not ordinary are the ones a foreign renderer forces: the hooks (what they may
// assume about the tree when they run) and what happens when the foreign renderer moves the element
// it was given — which is where the sharpest limit in this file lives, because REMOVAL CLIMBS AND
// PLACEMENT DOES NOT. The last block holds the WALLS up: a raw element still throws, an element
// that is already a child cannot be made into a second one, an element something else already owns
// is refused at the door, and one element cannot be in two lists.
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoNode,
    TExoMachineInitialState,
} from '@exodra/core';
import { wireExoNode } from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { host, source, createExoTestMachine } from '@exodra/test-utils';
import type { TExoTestSource } from '@exodra/test-utils';
import type { TExoDomNode } from '../../dom/EXO_DOM_NODE_VOCABULARY';
import { exoNodeDom } from '../../dom/exoNodeDom';
import { exoOnTeardown } from '../../dom/exoTeardownScope';

import { exoForeignNode } from '../exoForeignNode';
import { placeExoChildrenFrom } from './placeExoChildrenFrom';
import type { TExoDomMark } from '../../dom/types/TExoDomMark';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());
/** An ordinary child, so a foreign one always has neighbours built the normal way. */
const ROW = createExoTestMachine(
    (b) => {
        let id!: TExoAttrPort;
        b.el('li', null, (li) => {
            id = li.port('data-id');
        });
        return { id };
    },
    (P): TExoMachineInitialState<TExoDomNode> =>
        (c, id) => {
            c.attr(P.id, id);
        }
);

const buildRow = (c: TExoDomNode, id: string): TExoNode<TExoDomMark> =>
    wireExoNode(c.createExoNode(ROW), id);

/**
 * A `<ul>` whose ONE child is a children port — so the port owns its element and a full clear
 * takes the `clearOwnedExoChildList` fast path, which is a different code path from a partial removal
 * and is why two of the cases below empty the list rather than shorten it.
 */
const mount = (src: TExoTestSource<readonly TExoNode<TExoDomMark>[]>) => {
    let exonode!: TExoDomNode;
    const LIST = createExoTestMachine(
        (b) => {
            let kids!: TExoChildrenPort;
            b.el('ul', null, (ul) => {
                kids = ul.childrenPort();
            });
            return { kids };
        },
        (P): TExoMachineInitialState<TExoDomNode> =>
            (c) => {
                exonode = c;
                placeExoChildrenFrom(c, P.kids, src);
            }
    );
    const parent = host();
    const dispose = EXO_BACKEND.render(LIST, parent);
    const ul = parent.querySelector('ul') as HTMLElement;
    return {
        dispose,
        ul,
        /**
         * THE INSTANCE `exoForeignNode` IS HANDED, and the reason every case below has to have one
         * in scope: the door builds the foreign child through THIS instance's schema, so it stands
         * on the same prototype as the rows this list built. A literal made up here would seat it
         * on `Object.prototype` and give the reconciler the second shape the argument exists to
         * prevent — so the cases with no list of their own render an empty one for it.
         */
        exonode,
        build: (item: string): TExoNode<TExoDomMark> => buildRow(exonode, item),
        /** The `data-id` of every element in the port, in tree order. A foreign element carries
         *  one too, so an assertion cannot tell which children were built and which were not —
         *  which is the property under test. */
        shown: (): string =>
            Array.from(ul.children)
                .map((el) => el.getAttribute('data-id'))
                .join(','),
    };
};

/**
 * An exonode for the cases that place nothing: an empty list, rendered for its wire alone. They
 * still need a real instance, because that is what the door builds the child through.
 */
const emptyListNode = (): TExoDomNode =>
    mount(source<readonly TExoNode<TExoDomMark>[]>([])).exonode;

/** An element nothing in this package made: created here, filled here, owned by the caller. */
const foreignElement = (id: string): HTMLElement => {
    const el = document.createElement('li');
    el.setAttribute('data-id', id);
    el.innerHTML = '<b>drawn by somebody else</b>';
    return el;
};

describe('exoForeignNode — a foreign element is an ordinary child', () => {
    it('places it among built children, in order, with its own content untouched', () => {
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src);
        const el = foreignElement('f');
        src.setValue([list.build('a'), exoForeignNode(list.exonode, el), list.build('b')]);
        expect(list.shown()).toBe('a,f,b');
        // The very element that was handed in, not a copy of it, and nothing wired into it.
        expect(list.ul.children[1]).toBe(el);
        expect(el.innerHTML).toBe('<b>drawn by somebody else</b>');
    });

    it('moves the very same element on a reorder instead of rebuilding it', () => {
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src);
        const el = foreignElement('f');
        let mounts = 0;
        const a = list.build('a');
        const b = list.build('b');
        const f = exoForeignNode(list.exonode, el, {
            onMount: () => {
                mounts++;
            },
        });
        src.setValue([a, f, b]);
        expect(mounts).toBe(1);
        src.setValue([b, f, a]);
        expect(list.shown()).toBe('b,f,a');
        // IDENTITY IS THE ASSERTION. A reorder relocates the node; it does not make a new one,
        // and it is not a mount — so a foreign renderer holding this element still holds the
        // element that is on screen, and was not told anything happened.
        expect(list.ul.children[1]).toBe(el);
        expect(mounts).toBe(1);
    });

    it('reaches the element back through the public accessor, as any child does', () => {
        const c = emptyListNode();
        const el = foreignElement('f');
        expect(exoNodeDom(exoForeignNode(c, el)).node).toBe(el);
    });
});

describe('exoForeignNode — when the hooks run', () => {
    it('mount runs after the element is in the tree', () => {
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src);
        const el = foreignElement('f');
        let parentAtMount: Node | null = null;
        let connectedAtMount = false;
        src.setValue([
            list.build('a'),
            exoForeignNode(list.exonode, el, {
                onMount: () => {
                    parentAtMount = el.parentNode;
                    connectedAtMount = el.isConnected;
                },
            }),
        ]);
        expect(parentAtMount).toBe(list.ul);
        expect(connectedAtMount).toBe(true);
    });

    it('unmount runs while the element is still attached', () => {
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src);
        const el = foreignElement('f');
        let parentAtUnmount: Node | null = null;
        let connectedAtUnmount = false;
        let unmounts = 0;
        const a = list.build('a');
        const b = list.build('b');
        const f = exoForeignNode(list.exonode, el, {
            onUnmount: () => {
                unmounts++;
                parentAtUnmount = el.parentNode;
                connectedAtUnmount = el.isConnected;
            },
        });
        src.setValue([a, f, b]);
        // A partial removal, so this goes through `dropExoChild` — the per-child path, whose
        // contract is that `unmount` precedes the removal.
        src.setValue([a, b]);
        expect(unmounts).toBe(1);
        expect(parentAtUnmount).toBe(list.ul);
        expect(connectedAtUnmount).toBe(true);
        expect(list.shown()).toBe('a,b');
        expect(el.isConnected).toBe(false);
    });

    it('unmount runs with the whole child list still in place when the list is cleared', () => {
        // The owned-child list clear is a different path from `dropExoChild`: every `unmount` runs
        // BEFORE the one assignment that empties the parent, so a foreign renderer torn down by
        // a clear sees not only itself but its neighbours still on screen.
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src);
        const el = foreignElement('f');
        let siblingsAtUnmount = -1;
        let unmounts = 0;
        src.setValue([
            list.build('a'),
            exoForeignNode(list.exonode, el, {
                onUnmount: () => {
                    unmounts++;
                    siblingsAtUnmount = list.ul.children.length;
                },
            }),
            list.build('b'),
        ]);
        src.setValue([]);
        expect(unmounts).toBe(1);
        expect(siblingsAtUnmount).toBe(3);
        expect(list.ul.children.length).toBe(0);
        expect(el.isConnected).toBe(false);
    });

    it('fires both hooks again when the child leaves and comes back', () => {
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src);
        const el = foreignElement('f');
        const order: string[] = [];
        const a = list.build('a');
        const f = exoForeignNode(list.exonode, el, {
            onMount: () => order.push('mount'),
            onUnmount: () => order.push('unmount'),
        });
        src.setValue([a, f]);
        src.setValue([a]);
        src.setValue([a, f]);
        expect(order).toEqual(['mount', 'unmount', 'mount']);
        expect(list.shown()).toBe('a,f');
        expect(list.ul.children[1]).toBe(el);
    });

    it('tells a child still on screen when the whole render is disposed', () => {
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src);
        const el = foreignElement('f');
        let connectedAtUnmount = false;
        let unmounts = 0;
        src.setValue([
            exoForeignNode(list.exonode, el, {
                onUnmount: () => {
                    unmounts++;
                    connectedAtUnmount = el.isConnected;
                },
            }),
        ]);
        list.dispose();
        // A survivor is never dropped, so this is the list's own teardown disposer — and it is
        // the only chance a foreign renderer gets to stop whatever it started.
        expect(unmounts).toBe(1);
        expect(connectedAtUnmount).toBe(true);
    });
});

describe('exoForeignNode — a foreign renderer that wants a root of its own', () => {
    /**
     * WRAPPING FROM THE `mount` HOOK — the moment such a renderer would do it, since the element
     * is in the tree and there is something to wrap it in front of. It is also the one
     * displacement the door can SEE, so it is the one it refuses.
     */
    const wrapOnMount = (el: HTMLElement, wrapper: HTMLElement): (() => void) => {
        return () => {
            const parent = el.parentNode as Element;
            parent.insertBefore(wrapper, el);
            wrapper.appendChild(el);
        };
    };

    /** The same wrap, performed by hand AFTER the child has been placed — invisible to the door. */
    const wrapAfterMount = (el: HTMLElement, wrapper: HTMLElement): void => {
        const parent = el.parentNode as Element;
        parent.insertBefore(wrapper, el);
        wrapper.appendChild(el);
    };

    it('refuses a mount hook that wraps the element', () => {
        // THE RULE THIS PINS: from `mount` until `unmount` returns, the element stays a DIRECT
        // child of the parent the list put it in. Removal climbs, so a wrapper used to look
        // survivable; nothing else climbs, so the wrapped element is a landmine under its own
        // position — see the next two cases for what it detonates.
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src);
        const el = foreignElement('f');
        const wrapper = document.createElement('div');
        const f = exoForeignNode(list.exonode, el, { onMount: wrapOnMount(el, wrapper) });
        expect(() => src.setValue([list.build('a'), f])).toThrow(
            /moved this element out of the parent the list put it in/
        );
    });

    it('takes a container the renderer draws INSIDE, through every list operation', () => {
        // THE SHAPE THAT IS ALWAYS RIGHT, and the one the refusal above pushes a caller towards:
        // the element handed in is a CONTAINER, and the foreign renderer puts its own root inside
        // it. Then placement, anchoring, reordering and removal are all ordinary.
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src);
        const el = foreignElement('f');
        const drawn = document.createElement('canvas');
        const a = list.build('a');
        const b = list.build('b');
        const f = exoForeignNode(list.exonode, el, {
            onMount: () => {
                el.appendChild(drawn);
            },
        });
        src.setValue([a, f, b]);
        expect(list.shown()).toBe('a,f,b');
        expect(el.lastElementChild).toBe(drawn);
        // A SIBLING INSERTED IN FRONT OF IT — the pure-insertion path, whose anchor is this very
        // element. This is the operation a wrapped element cannot survive.
        const c = list.build('c');
        src.setValue([a, c, f, b]);
        expect(list.shown()).toBe('a,c,f,b');
        expect(list.ul.children[2]).toBe(el);
        // A reorder moves the container, and the foreign root rides along inside it.
        src.setValue([b, f, c, a]);
        expect(list.shown()).toBe('b,f,c,a');
        expect(list.ul.children[1]).toBe(el);
        expect(drawn.parentNode).toBe(el);
        src.setValue([b, c, a]);
        expect(el.isConnected).toBe(false);
        expect(drawn.parentNode).toBe(el);
    });

    it('still removes a wrapper put in AFTER mount whole, because dropExoChild climbs', () => {
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src);
        const el = foreignElement('f');
        const wrapper = document.createElement('div');
        wrapper.setAttribute('data-id', 'wrapper');
        const a = list.build('a');
        const b = list.build('b');
        const f = exoForeignNode(list.exonode, el);
        src.setValue([a, f, b]);
        // The door only sees the `mount` hook. A renderer that reparents itself later — from a
        // timeout, a frame, its own update — arrives here, and the climb is what covers it.
        wrapAfterMount(el, wrapper);
        expect(list.shown()).toBe('a,wrapper,b');
        // `dropExoChild` climbs `parentNode` from `el` up to the node whose parent is the child list's
        // parent — the wrapper — and removes THAT. Removing `el` alone would leave an empty
        // `<div>` in the list forever, with no slot in `order` for any later diff to find it by.
        src.setValue([a, b]);
        expect(list.shown()).toBe('a,b');
        expect(wrapper.isConnected).toBe(false);
        expect(el.isConnected).toBe(false);
    });

    it('is removed whole by an owned-child list clear as well', () => {
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src);
        const el = foreignElement('f');
        const wrapper = document.createElement('div');
        const f = exoForeignNode(list.exonode, el);
        src.setValue([list.build('a'), f]);
        wrapAfterMount(el, wrapper);
        src.setValue([]);
        expect(list.ul.children.length).toBe(0);
        expect(wrapper.isConnected).toBe(false);
        expect(el.isConnected).toBe(false);
    });

    it('inserts beside a wrapper put in after mount', () => {
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src);
        const el = foreignElement('f');
        const wrapper = document.createElement('div');
        wrapper.setAttribute('data-id', 'wrapper');
        const a = list.build('a');
        const b = list.build('b');
        const f = exoForeignNode(list.exonode, el);
        src.setValue([a, f, b]);
        wrapAfterMount(el, wrapper);
        const c = list.build('c');
        expect(() => src.setValue([a, c, f, b])).not.toThrow();
        expect(exoNodeDom(c).node.isConnected).toBe(true);
        expect(list.shown()).toBe('a,c,wrapper,b');
    });

    it('leaves an element moved out after mount where it went — the same element, untouched', () => {
        // THE DOCUMENTED LIMIT, pinned so it cannot change silently. A root relocated out of the
        // child list's parent is beyond the climb: `dropExoChild` walks to `null` and removes nothing,
        // and Exodra's own books are still consistent. Only the `unmount` hook can reach it.
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src);
        const el = foreignElement('f');
        const elsewhere = host();
        const a = list.build('a');
        const b = list.build('b');
        let unmounts = 0;
        const f = exoForeignNode(list.exonode, el, {
            onUnmount: () => {
                unmounts++;
            },
        });
        src.setValue([a, f, b]);
        // AFTER mount, so the door's one check has already passed — this is the shape a renderer
        // that portals itself away actually produces.
        elsewhere.appendChild(el);
        src.setValue([a, b]);
        expect(list.shown()).toBe('a,b');
        expect(unmounts).toBe(1);
        // IDENTITY IS THE ASSERTION, and it is what tells this apart from a clone: the element
        // still standing elsewhere is the very one handed in, it is still what this child's node
        // field points at, and its content was never touched by anything in this package.
        expect(elsewhere.firstChild).toBe(el);
        expect(exoNodeDom(f).node).toBe(el);
        expect(el.innerHTML).toBe('<b>drawn by somebody else</b>');
    });
});

describe('exoForeignNode — the walls that stay up', () => {
    it('a raw element with no factory is still refused', () => {
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        mount(src);
        const stranger = document.createElement('li') as unknown as TExoNode<TExoDomMark>;
        expect(() => src.setValue([stranger])).toThrow(/not made by c\.createExoNode/);
    });

    it('refuses the element of a PLACED built child', () => {
        // IT IS THE PARENT THAT CATCHES THIS ONE NOW, and the change is worth naming. A built
        // element used to carry a mark back to its child, so this arrived at the first refusal
        // with "already carries an Exodra child lifecycle"; the mark has been removed and the
        // door's own ledger holds only what IT adopted, so a row of somebody's list is a stranger
        // to it. What is left is the evidence every foreign door has always leaned on — the
        // element is in a tree, so something else already owns it — and the refusal is the same
        // refusal, at the same call, with the other message.
        //
        // WHAT NO LONGER THROWS AT ALL, said out loud rather than left to be found: the same
        // child's element BEFORE it is placed, or after a list has dropped it. It is in no tree
        // and in no ledger, so it walks through both doors and gets a second lifecycle. Pass the
        // CHILD, not its element.
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src);
        const built = list.build('a');
        // PLACED FIRST, because a built child has no element until a list materialises it — see
        // `materialiseExoChild`, and because being placed is now the whole of what makes this
        // detectable.
        src.setValue([built]);
        expect(() => exoForeignNode(list.exonode, exoNodeDom(built).node)).toThrow(
            /already in a tree/
        );
    });

    it('refuses the same element twice', () => {
        const c = emptyListNode();
        const el = foreignElement('f');
        exoForeignNode(c, el);
        expect(() => exoForeignNode(c, el)).toThrow(/already carries an Exodra child lifecycle/);
    });

    it('refuses an element of a live render that the door never adopted', () => {
        // THE CASE THE DOOR'S OWN LEDGER CANNOT SEE, and the reason it tests parentage as well.
        // The ledger holds only elements `exoForeignNode` itself handed out; this `<ul>` is an
        // instance root, so it is outside it — exactly like every interior element of every
        // compiled schema, like every row a list built, like any element of another framework, and
        // like `document.body`. Accepted, it would become a second lifecycle for an element this
        // render's setters still write into.
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src);
        expect(() => exoForeignNode(list.exonode, list.ul)).toThrow(/already in a tree/);
    });

    it('refuses an element that is inside something else, connected or not', () => {
        // Detached, but owned: the interior of somebody else's element. Placing it would tear it
        // out of there and nothing would report it.
        const c = emptyListNode();
        const inside = foreignElement('f').querySelector('b') as HTMLElement;
        expect(() => exoForeignNode(c, inside)).toThrow(/already in a tree/);
        // And the live case — a node another framework put on the page, which nothing in this
        // package has ever heard of. The parent is the only evidence available at the door.
        const page = host();
        page.innerHTML = '<span>drawn by another framework</span>';
        expect(() => exoForeignNode(c, page.firstElementChild as HTMLElement)).toThrow(
            /already in a tree/
        );
    });

    it('refuses a foreign child that a second list places while the first still holds it', () => {
        // ONE ELEMENT CANNOT BE IN TWO PLACES. Unrefused, list two's `insertBefore` relocates the
        // element out of list one's parent, both lists go on holding it, and the first drop runs
        // the caller's teardown on a widget that is visibly on screen inside the other.
        const first = source<readonly TExoNode<TExoDomMark>[]>([]);
        const second = source<readonly TExoNode<TExoDomMark>[]>([]);
        const one = mount(first);
        mount(second);
        const el = foreignElement('f');
        let unmounts = 0;
        const f = exoForeignNode(one.exonode, el, {
            onUnmount: () => {
                unmounts++;
            },
        });
        first.setValue([f]);
        expect(() => second.setValue([f])).toThrow(/while a list already holds it/);
        // The teardown hook has NOT run — which is the whole point of refusing here.
        expect(unmounts).toBe(0);
        // AND THE HONEST HALF: the refusal fires from `mount()`, which the second list calls AFTER
        // its `insertBefore` — so the element has already left the first list's parent by the time
        // anything can tell. Nothing here can put it back; what it buys is that the mistake is
        // named at the operation that made it instead of surfacing later as a teardown hook
        // running on a widget that is still on screen.
        expect(one.ul.children.length).toBe(0);
    });

    it('refuses the same foreign child twice in one array', () => {
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src);
        const f = exoForeignNode(list.exonode, foreignElement('f'));
        const twice = (): void => src.setValue([list.build('a'), f, f]);
        expect(twice).toThrow(/while a list already holds it/);
    });

    it('ends the child anyway when the unmount hook throws', () => {
        // HOOK FIRST, DEFAULT TEARDOWN IN A `finally`. A foreign renderer's teardown is the most
        // likely thing on the page to throw, and without the `finally` the throw would skip
        // `DISPOSE_SELF` — producing exactly the leak this wrapper exists to prevent.
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src);
        const el = foreignElement('f');
        const a = list.build('a');
        const f = exoForeignNode(list.exonode, el, {
            onUnmount: () => {
                throw new Error('the widget blew up');
            },
        });
        src.setValue([a, f]);
        let disposed = false;
        exoOnTeardown(exoNodeDom(f), () => {
            disposed = true;
        });
        expect(() => src.setValue([a])).toThrow('the widget blew up');
        expect(disposed).toBe(true);
        // THE SINK EXISTS AND IS EMPTY — asserted as `[]` rather than as `.length === 0` because
        // the field is `null` until the first `onTeardown` (see `TExoDomChild.disposers`), and `null` must
        // NOT satisfy this line: the claim is that `disposeSelf` still ran after the hook threw,
        // which is only visible on a child that took a subscription out.
        expect(exoNodeDom(f).disposers).toEqual([]);
    });
});
