import type { TExoSchema } from '@exodra/core';
// From the types-only contract package, NOT from @exodra/reactivity: these are
// pure types, and depending on an implementation would force every consumer of
// the JSX types to install a reactivity runtime they may not use (an app driven
// by an adapter such as @oimdb/exodra never installs @exodra/reactivity).
import type {
    TExoBindable,
    TExoBindableList,
    TExoWritableBindable,
} from '@exodra/reactivity-types';

// Fragment symbol for <></> syntax.
export const Fragment = Symbol.for('exodra.fragment');

// JSX REQUIRES THE BABEL PLUGIN. TypeScript's own JSX transform is incompatible —
// @exodra/babel-plugin-jsx compiles JSX directly to h() calls, bucketing the
// props below 1:1 into the node schema. These types make that explicit and typed:
// reactivity goes through `bindable`/`bindableList`, events through `handlers`/
// `bindableHandlers`, and plain DOM attributes through `static`. There is NO magic
// mapping of flat `onClick` → handlers; flat `on*` props are a type error.

// --- bucket value types -----------------------------------------------------

/** Any reactive scalar (textContent, value, an attribute, a single child…). */
type ExoBindableValue = TExoBindable<unknown, unknown>;

/** A writable bindable, e.g. the target of a `bind:value` / `bind:checked`. */
type ExoWritable = TExoWritableBindable<unknown, unknown>;

/** Primitive DOM attribute value. */
type ExoAttrValue = string | number | boolean | null | undefined;

/** A static (never-changing) child. */
type ExoChild = TExoSchema | string | number | boolean | null | undefined;

/** JSX children, as authored — flattened into `static.children` by the compiler. */
export type ExoJsxChildren =
    | ExoChild
    | readonly ExoChild[]
    | readonly (ExoChild | readonly ExoChild[])[];

/** The `static` bucket: plain DOM attributes + static children + lifecycle hooks. */
export interface ExoStaticBucket {
    id?: string;
    class?: string;
    className?: string;
    style?: string;
    title?: string;
    role?: string;
    hidden?: boolean;
    tabIndex?: number;
    lang?: string;
    dir?: 'ltr' | 'rtl' | 'auto';
    draggable?: boolean;
    contentEditable?: boolean | 'true' | 'false';
    // form / interactive
    type?: string;
    name?: string;
    value?: string | number;
    placeholder?: string;
    disabled?: boolean;
    checked?: boolean;
    selected?: boolean;
    readOnly?: boolean;
    required?: boolean;
    autocomplete?: string;
    autofocus?: boolean;
    min?: string | number;
    max?: string | number;
    step?: string | number;
    multiple?: boolean;
    rows?: number;
    cols?: number;
    // anchor / media / table
    href?: string;
    target?: string;
    rel?: string;
    src?: string;
    alt?: string;
    width?: string | number;
    height?: string | number;
    for?: string;
    htmlFor?: string;
    colSpan?: number;
    rowSpan?: number;
    // text + children
    textContent?: string | number;
    children?: ExoJsxChildren;
    // lifecycle hooks — read from `static` by the renderer
    onExoMount?: (node: { element: unknown }) => void;
    onExoUnmount?: (node: { element: unknown }) => void;
    // data-* / aria-*
    [attr: `data-${string}`]: ExoAttrValue;
    [attr: `aria-${string}`]: ExoAttrValue;
}

/** The `bindable` bucket: reactive scalar values keyed by prop name. */
export interface ExoBindableBucket {
    textContent?: ExoBindableValue;
    value?: ExoBindableValue;
    class?: ExoBindableValue;
    className?: ExoBindableValue;
    /** A reactive single child (signal of a schema). */
    children?: ExoBindableValue;
    [attr: string]: ExoBindableValue | undefined;
}

/** The `bindableList` bucket: reactive lists keyed by prop name (usually children). */
export interface ExoBindableListBucket {
    children?: TExoBindableList<TExoSchema, unknown>;
    [attr: string]: TExoBindableList<unknown, unknown> | undefined;
}

/**
 * A DOM event whose `currentTarget` is narrowed to the element the handler is
 * attached to — so `event.currentTarget.value` on an `<input>` is typed with NO
 * cast. `target` is deliberately left as the DOM default (`EventTarget | null`):
 * it is whatever dispatched the event and may be a descendant, so narrowing it
 * would be unsound. Read `event.currentTarget` for the element you put the handler
 * on (they coincide when the handler sits directly on the input).
 */
export type ExoEvent<E extends EventTarget, Ev extends Event = Event> = Ev & {
    readonly currentTarget: E;
};

// Ergonomic aliases for the common form elements. An INLINE handler infers its param
// from the element (thanks to `LibraryManagedAttributes` passing the intrinsic props
// through), so you rarely need these:
//   handlers={{ onInput: e => set(e.currentTarget.value) }}   // e: ExoEvent<HTMLInputElement>
// Reach for an alias only when the handler is a DETACHED function (defined outside the
// JSX, so there is no contextual site to infer from):
//   const onSearch = (e: ExoInputEvent) => set(e.currentTarget.value);
export type ExoInputEvent<Ev extends Event = Event> = ExoEvent<HTMLInputElement, Ev>;
export type ExoSelectEvent<Ev extends Event = Event> = ExoEvent<HTMLSelectElement, Ev>;
export type ExoTextAreaEvent<Ev extends Event = Event> = ExoEvent<HTMLTextAreaElement, Ev>;
export type ExoFormEvent<Ev extends Event = Event> = ExoEvent<HTMLFormElement, Ev>;

/**
 * The `handlers` bucket: typed DOM event handlers. No `any`, no flat mapping.
 * Generic over the element `E` so `event.currentTarget` is that element (e.g.
 * `HTMLInputElement` for `<input>`). Defaults to `HTMLElement`, so annotating a
 * handler's param stays optional and existing `(e: MouseEvent) => …` code still
 * type-checks (a wider param is assignable to a narrower one).
 */
export interface ExoEventHandlers<E extends EventTarget = HTMLElement> {
    onClick?: (event: ExoEvent<E, MouseEvent>) => void;
    onDblClick?: (event: ExoEvent<E, MouseEvent>) => void;
    onMouseDown?: (event: ExoEvent<E, MouseEvent>) => void;
    onMouseUp?: (event: ExoEvent<E, MouseEvent>) => void;
    onMouseEnter?: (event: ExoEvent<E, MouseEvent>) => void;
    onMouseLeave?: (event: ExoEvent<E, MouseEvent>) => void;
    onMouseMove?: (event: ExoEvent<E, MouseEvent>) => void;
    onMouseOver?: (event: ExoEvent<E, MouseEvent>) => void;
    onMouseOut?: (event: ExoEvent<E, MouseEvent>) => void;
    onContextMenu?: (event: ExoEvent<E, MouseEvent>) => void;
    onFocus?: (event: ExoEvent<E, FocusEvent>) => void;
    onBlur?: (event: ExoEvent<E, FocusEvent>) => void;
    onInput?: (event: ExoEvent<E>) => void;
    onChange?: (event: ExoEvent<E>) => void;
    onSubmit?: (event: ExoEvent<E, SubmitEvent>) => void;
    onReset?: (event: ExoEvent<E>) => void;
    onKeyDown?: (event: ExoEvent<E, KeyboardEvent>) => void;
    onKeyUp?: (event: ExoEvent<E, KeyboardEvent>) => void;
    onKeyPress?: (event: ExoEvent<E, KeyboardEvent>) => void;
    onScroll?: (event: ExoEvent<E>) => void;
    onWheel?: (event: ExoEvent<E, WheelEvent>) => void;
    onLoad?: (event: ExoEvent<E>) => void;
    onError?: (event: ExoEvent<E>) => void;
    onPointerDown?: (event: ExoEvent<E, PointerEvent>) => void;
    onPointerUp?: (event: ExoEvent<E, PointerEvent>) => void;
    onPointerMove?: (event: ExoEvent<E, PointerEvent>) => void;
    onTouchStart?: (event: ExoEvent<E, TouchEvent>) => void;
    onTouchEnd?: (event: ExoEvent<E, TouchEvent>) => void;
    onTouchMove?: (event: ExoEvent<E, TouchEvent>) => void;
    onDragStart?: (event: ExoEvent<E, DragEvent>) => void;
    onDragEnd?: (event: ExoEvent<E, DragEvent>) => void;
    onDragOver?: (event: ExoEvent<E, DragEvent>) => void;
    onDrop?: (event: ExoEvent<E, DragEvent>) => void;
}

/** The `bindableHandlers` bucket: reactive event handlers (signal of a listener). */
export type ExoBindableHandlers = {
    [K in keyof ExoEventHandlers]?: TExoBindable<EventListener | null, unknown>;
};

// --- intrinsic element props ------------------------------------------------

// One props shape for every intrinsic element: STRICT — only the five typed
// buckets, children, and the compiler directives. There are NO flat attributes:
// every prop declares its bucket, so the static/reactive/event split is always
// explicit. A flat `class=` or `onClick=` is a type error (and a compiler error).
export interface ExoIntrinsicProps<E extends EventTarget = HTMLElement> {
    static?: ExoStaticBucket;
    bindable?: ExoBindableBucket;
    bindableList?: ExoBindableListBucket;
    handlers?: ExoEventHandlers<E>;
    bindableHandlers?: ExoBindableHandlers;
    children?: ExoJsxChildren;
    // `props={obj}` — spread a full bucket object (the schema shape: `static` /
    // `bindables` / `bindableLists` / `handlers` / `bindableHandlers`) into the
    // element. It's a plain JS spread (the base); inline buckets on the element
    // override it. Helpers that return this shape (`@exodra/forms`' `bindText`,
    // `@oimdb/exodra` bindings) drop straight in. JSX allows one `props=` per
    // element — compose several explicitly with `props={mergeAttrs(a, b)}`.
    props?: Partial<TExoSchema['attrs']>;
    // compiler directives (consumed by @exodra/babel-plugin-jsx, not DOM attrs)
    'cache:key'?: symbol | string;
    'exo:schema'?: TExoSchema['attrs'];
    'bind:value'?: ExoWritable;
    'bind:checked'?: ExoWritable;
}

// eslint-disable-next-line @typescript-eslint/no-namespace -- TypeScript's JSX type resolution requires a `JSX` namespace; it is the canonical, non-optional convention for a jsxImportSource runtime and cannot be expressed with ES2015 module syntax.
export namespace JSX {
    export type Element = TExoSchema;
    export type ElementType =
        | string
        | typeof Fragment
        | ((...args: never[]) => TExoSchema | readonly TExoSchema[]);

    // How `<Comp .../>` attributes are type-checked for CUSTOM components.
    // `defineComponent<A>` brands the component type with a phantom
    // `__exoProps?: A` (the typed buckets it accepts). TS reads it here to
    // decide the element's attribute type. Components WITHOUT the brand infer
    // `A` as `unknown` and stay loose (accept any props) — backward compatible.
    // The naive prop type (the component's first parameter — an ExoContext) is
    // intentionally ignored: in Exodra props are read from context by name, not
    // passed as the function argument.
    //
    // CRITICAL: the no-brand branch MUST pass `TProps` through, NOT collapse to
    // `Record<string, unknown>`. INTRINSIC elements (`<input>`, …) also flow
    // through here — they have no `__exoProps`, so returning `Record<string,
    // unknown>` would DISCARD their real prop types (`ExoIntrinsicProps<E>`) and
    // kill TS's contextual typing of handler params (`handlers={{ onInput: e =>
    // e.currentTarget.value }}` would leave `e` as `any`). Passing `TProps`
    // preserves the intrinsic props so `e` infers as `ExoEvent<E>`.
    export type LibraryManagedAttributes<TComponent, TProps> =
        TComponent extends { readonly __exoProps?: infer A }
            ? unknown extends A
                ? Record<string, unknown>
                : A
            : TProps;

    export interface ElementChildrenAttribute {
        children: Record<never, never>;
    }
    export interface IntrinsicAttributes {
        'cache:key'?: symbol | string;
    }

    export interface IntrinsicElements {
        // structure
        div: ExoIntrinsicProps;
        span: ExoIntrinsicProps;
        p: ExoIntrinsicProps;
        h1: ExoIntrinsicProps;
        h2: ExoIntrinsicProps;
        h3: ExoIntrinsicProps;
        h4: ExoIntrinsicProps;
        h5: ExoIntrinsicProps;
        h6: ExoIntrinsicProps;
        section: ExoIntrinsicProps;
        article: ExoIntrinsicProps;
        aside: ExoIntrinsicProps;
        header: ExoIntrinsicProps;
        footer: ExoIntrinsicProps;
        main: ExoIntrinsicProps;
        nav: ExoIntrinsicProps;
        ul: ExoIntrinsicProps;
        ol: ExoIntrinsicProps;
        li: ExoIntrinsicProps;
        dl: ExoIntrinsicProps;
        dt: ExoIntrinsicProps;
        dd: ExoIntrinsicProps;
        table: ExoIntrinsicProps;
        thead: ExoIntrinsicProps;
        tbody: ExoIntrinsicProps;
        tfoot: ExoIntrinsicProps;
        tr: ExoIntrinsicProps;
        td: ExoIntrinsicProps;
        th: ExoIntrinsicProps;
        caption: ExoIntrinsicProps;
        colgroup: ExoIntrinsicProps;
        col: ExoIntrinsicProps;
        // text
        strong: ExoIntrinsicProps;
        em: ExoIntrinsicProps;
        b: ExoIntrinsicProps;
        i: ExoIntrinsicProps;
        small: ExoIntrinsicProps;
        mark: ExoIntrinsicProps;
        s: ExoIntrinsicProps;
        u: ExoIntrinsicProps;
        abbr: ExoIntrinsicProps;
        cite: ExoIntrinsicProps;
        q: ExoIntrinsicProps;
        sub: ExoIntrinsicProps;
        sup: ExoIntrinsicProps;
        // code
        code: ExoIntrinsicProps;
        pre: ExoIntrinsicProps;
        kbd: ExoIntrinsicProps;
        samp: ExoIntrinsicProps;
        var: ExoIntrinsicProps;
        // void / semantic
        br: ExoIntrinsicProps;
        hr: ExoIntrinsicProps;
        blockquote: ExoIntrinsicProps;
        figure: ExoIntrinsicProps;
        figcaption: ExoIntrinsicProps;
        details: ExoIntrinsicProps;
        summary: ExoIntrinsicProps;
        time: ExoIntrinsicProps;
        address: ExoIntrinsicProps;
        progress: ExoIntrinsicProps;
        meter: ExoIntrinsicProps;
        // form — specialized so `event.currentTarget` is the concrete element
        input: ExoIntrinsicProps<HTMLInputElement>;
        button: ExoIntrinsicProps<HTMLButtonElement>;
        textarea: ExoIntrinsicProps<HTMLTextAreaElement>;
        select: ExoIntrinsicProps<HTMLSelectElement>;
        option: ExoIntrinsicProps<HTMLOptionElement>;
        optgroup: ExoIntrinsicProps<HTMLOptGroupElement>;
        form: ExoIntrinsicProps<HTMLFormElement>;
        label: ExoIntrinsicProps;
        fieldset: ExoIntrinsicProps;
        legend: ExoIntrinsicProps;
        datalist: ExoIntrinsicProps;
        output: ExoIntrinsicProps;
        // media
        img: ExoIntrinsicProps;
        video: ExoIntrinsicProps;
        audio: ExoIntrinsicProps;
        source: ExoIntrinsicProps;
        track: ExoIntrinsicProps;
        picture: ExoIntrinsicProps;
        svg: ExoIntrinsicProps;
        path: ExoIntrinsicProps;
        // links / other
        a: ExoIntrinsicProps<HTMLAnchorElement>;
        canvas: ExoIntrinsicProps;
        iframe: ExoIntrinsicProps;
        script: ExoIntrinsicProps;
        style: ExoIntrinsicProps;
        link: ExoIntrinsicProps;
        meta: ExoIntrinsicProps;
        title: ExoIntrinsicProps;
    }
}
