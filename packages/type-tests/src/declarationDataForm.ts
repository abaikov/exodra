// CAN A DECLARATION WRITTEN AS DATA HAND BACK THE AUTHOR'S PORT NAMES, TYPED BY KIND?
//
// Today a declaration is a FUNCTION and the names come out of what it returns: the author declares
// `let title!: TExoTextPort`, the cursor assigns it, and `return { title }` is what types
// `schema.ports.title`. The name and its kind are spelled by hand, twice.
//
// A declaration written as data has no return and no holder to spell. If the names cannot be
// recovered from the literal, the data form can only ever hand back ports by NUMBER, and every
// wire written against it would index instead of naming — which is the one thing the cursor form
// buys. So this file is the prototype that answers it, and nothing imports it: it is the question
// asked of the compiler, and `tsc --noEmit` is the answer.
//
// WHAT IS BEING PROVEN, in order: the five kinds come back under the author's own `as` names; the
// walk reaches ports THREE levels down, not one; a name that was not declared is not on the map;
// and a port of one kind does not land in a holder declared for another.
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoEventPort,
    TExoRefPort,
    TExoTextPort,
    TExoWiring,
} from '@exodra/core';

/** The five kinds, spelled as the data form would spell them — one word per `*Port` call. */
type TExoDeclPortKind = 'attr' | 'text' | 'children' | 'event' | 'ref';

/** One port in the data form: its KIND, the markup name where the kind has one, and the name the
 *  author wants to fill it by. `as` is the whole point of this file. */
type TExoDeclPort = {
    readonly kind: TExoDeclPortKind;
    readonly name?: string;
    readonly as: string;
};

/** One element. `kids` is the recursion, and it is what makes the port walk a tree walk. */
type TExoDeclNode = {
    readonly el: string;
    readonly attrs?: Readonly<Record<string, string>>;
    readonly ports?: readonly TExoDeclPort[];
    readonly kids?: readonly TExoDeclNode[];
};

/** Kind word → the port type a wire has to be handed. */
type TExoPortOfKind<TKind extends TExoDeclPortKind> = TKind extends 'attr'
    ? TExoAttrPort
    : TKind extends 'text'
    ? TExoTextPort
    : TKind extends 'children'
    ? TExoChildrenPort
    : TKind extends 'event'
    ? TExoEventPort
    : TExoRefPort;

/** `{a: A} | {b: B}` → `{a: A} & {b: B}`, so the names collected down the tree land on ONE map
 *  rather than on a union nothing can read a single key off. */
type TExoAllOf<TUnion> = (TUnion extends unknown ? (held: TUnion) => void : never) extends (
    held: infer TOne
) => void
    ? TOne
    : never;

/** Every port this node declares, as a one-key map each. The node is matched against a shape
 *  carrying `ports` rather than indexed by `'ports'`: a node that declares none has no such key,
 *  and indexing one that is missing is how the first draft of this walk lost every kid. */
type TExoOwnPorts<TNode> = TNode extends { readonly ports: readonly TExoDeclPort[] }
    ? {
          [TPort in TNode['ports'][number] as TPort['as']]: TExoPortOfKind<TPort['kind']>;
      }
    : {};

/** THE WALK, and it is DISTRIBUTIVE on purpose: `kids` is a tuple of DIFFERENT node types, so
 *  `kids[number]` is a union, and a conditional that does not distribute asks its question of the
 *  union as one thing — which answers `{}` for the whole subtree. The naked `TNode extends` is
 *  what makes the compiler ask it once per kid. */
type TExoPortMaps<TNode> = TNode extends TExoDeclNode
    ?
          | TExoOwnPorts<TNode>
          | (TNode extends { readonly kids: readonly TExoDeclNode[] }
                ? TExoPortMaps<TNode['kids'][number]>
                : never)
    : never;

/** Every name the literal declared, at any depth, on one map. */
type TExoPortsOf<TNode extends TExoDeclNode> = TExoAllOf<TExoPortMaps<TNode>>;

// THE DECLARATION, as data. `satisfies` and not an annotation: an annotation would widen `as` to
// `string` and the names would be gone before any type could collect them.
const CARD = {
    el: 'article',
    attrs: { class: 'card' },
    ports: [
        { kind: 'attr', name: 'data-id', as: 'id' },
        { kind: 'ref', as: 'box' },
    ],
    kids: [
        {
            el: 'header',
            kids: [
                {
                    el: 'h3',
                    ports: [{ kind: 'text', as: 'title' }],
                },
                {
                    el: 'button',
                    attrs: { class: 'tog' },
                    ports: [{ kind: 'event', name: 'click', as: 'toggle' }],
                },
            ],
        },
        {
            el: 'ul',
            ports: [{ kind: 'children', as: 'rows' }],
        },
    ],
} as const satisfies TExoDeclNode;

type TCardPorts = TExoPortsOf<typeof CARD>;

declare const P: TCardPorts;
declare const c: TExoWiring;
declare function handler(): void;

// THE ANSWER, and it is yes for all five kinds: every name the literal wrote is a key, and each
// one arrives as the port type its kind mints. `id` and `box` are the root's own; `title` and
// `toggle` are THREE levels down (article → header → h3), which is the recursion working rather
// than one level of it.
c.attr(P.id, '7');
c.text(P.title, 'Hello');
c.on(P.toggle, handler);
c.unsafeHtml(P.rows, '<li>raw</li>');

const box: TExoRefPort = P.box;
const title: TExoTextPort = P.title;

// And the four refusals that make the four lines above mean something.

// @ts-expect-error a text port is not an attribute port, so the KIND survived the walk
const notAttr: TExoAttrPort = P.title;

// @ts-expect-error a ref port has no writer at all
c.attr(P.box, 'x');

// @ts-expect-error `heading` was never declared: the map is the literal's names and no others
c.text(P.heading, 'Hello');

// @ts-expect-error the markup name is not the port name — `data-id` is not a key
c.attr(P['data-id'], '7');

// THE MAP IS EXACTLY THESE FIVE KEYS, and this is the assertion the four lines above cannot make:
// a walk that resolved to `any` would satisfy every one of them and refuse nothing. `sameMap`
// pins both directions, and `notAny` is what catches `any` — which is mutually assignable with
// everything and would otherwise read as a pass.
type TSameType<TLeft, TRight> = [TLeft] extends [TRight]
    ? [TRight] extends [TLeft]
        ? true
        : false
    : false;

const sameMap: TSameType<
    TCardPorts,
    {
        readonly id: TExoAttrPort;
        readonly box: TExoRefPort;
        readonly title: TExoTextPort;
        readonly toggle: TExoEventPort;
        readonly rows: TExoChildrenPort;
    }
> = true;

const notAny: TSameType<TCardPorts, unknown> = false;

export { box, title, notAttr, sameMap, notAny };
export type { TCardPorts, TExoDeclNode, TExoDeclPort, TExoPortsOf };
