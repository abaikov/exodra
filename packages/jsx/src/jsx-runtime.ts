import type { TExoSchema } from '@exodra/core';
import type {
    TExoBindable,
    TExoBindableList,
    TExoWritableBindable,
} from '@exodra/reactivity';

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

/** The `handlers` bucket: typed DOM event handlers. No `any`, no flat mapping. */
export interface ExoEventHandlers {
    onClick?: (event: MouseEvent) => void;
    onDblClick?: (event: MouseEvent) => void;
    onMouseDown?: (event: MouseEvent) => void;
    onMouseUp?: (event: MouseEvent) => void;
    onMouseEnter?: (event: MouseEvent) => void;
    onMouseLeave?: (event: MouseEvent) => void;
    onMouseMove?: (event: MouseEvent) => void;
    onMouseOver?: (event: MouseEvent) => void;
    onMouseOut?: (event: MouseEvent) => void;
    onContextMenu?: (event: MouseEvent) => void;
    onFocus?: (event: FocusEvent) => void;
    onBlur?: (event: FocusEvent) => void;
    onInput?: (event: Event) => void;
    onChange?: (event: Event) => void;
    onSubmit?: (event: SubmitEvent) => void;
    onReset?: (event: Event) => void;
    onKeyDown?: (event: KeyboardEvent) => void;
    onKeyUp?: (event: KeyboardEvent) => void;
    onKeyPress?: (event: KeyboardEvent) => void;
    onScroll?: (event: Event) => void;
    onWheel?: (event: WheelEvent) => void;
    onLoad?: (event: Event) => void;
    onError?: (event: Event) => void;
    onPointerDown?: (event: PointerEvent) => void;
    onPointerUp?: (event: PointerEvent) => void;
    onPointerMove?: (event: PointerEvent) => void;
    onTouchStart?: (event: TouchEvent) => void;
    onTouchEnd?: (event: TouchEvent) => void;
    onTouchMove?: (event: TouchEvent) => void;
    onDragStart?: (event: DragEvent) => void;
    onDragEnd?: (event: DragEvent) => void;
    onDragOver?: (event: DragEvent) => void;
    onDrop?: (event: DragEvent) => void;
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
export interface ExoIntrinsicProps {
    static?: ExoStaticBucket;
    bindable?: ExoBindableBucket;
    bindableList?: ExoBindableListBucket;
    handlers?: ExoEventHandlers;
    bindableHandlers?: ExoBindableHandlers;
    children?: ExoJsxChildren;
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
    export type LibraryManagedAttributes<TComponent, _TProps> =
        TComponent extends { readonly __exoProps?: infer A }
            ? unknown extends A
                ? Record<string, unknown>
                : A
            : Record<string, unknown>;

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
        // form
        input: ExoIntrinsicProps;
        button: ExoIntrinsicProps;
        textarea: ExoIntrinsicProps;
        select: ExoIntrinsicProps;
        option: ExoIntrinsicProps;
        optgroup: ExoIntrinsicProps;
        form: ExoIntrinsicProps;
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
        a: ExoIntrinsicProps;
        canvas: ExoIntrinsicProps;
        iframe: ExoIntrinsicProps;
        script: ExoIntrinsicProps;
        style: ExoIntrinsicProps;
        link: ExoIntrinsicProps;
        meta: ExoIntrinsicProps;
        title: ExoIntrinsicProps;
    }
}
