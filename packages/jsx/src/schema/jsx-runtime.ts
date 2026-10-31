// Its own entry point because TypeScript resolves exactly ONE `JSX` namespace per file, from the
// module named in `jsxImportSource`. What no type can check here, the compiler checks — see README.

declare const EXO_JSX_PORT: unique symbol;

// Told apart by the brand alone, so `onClick={$.title}` is a type error where `{$.title}` is not.
export type TExoJsxAttrPort = { readonly [EXO_JSX_PORT]: 'attr' };
export type TExoJsxTextPort = { readonly [EXO_JSX_PORT]: 'text' };
export type TExoJsxEventPort = { readonly [EXO_JSX_PORT]: 'event' };
export type TExoJsxRefPort = { readonly [EXO_JSX_PORT]: 'ref' };
// Callable so that `<$.rows />` is a tag TypeScript accepts.
export type TExoJsxChildrenPort = {
    readonly [EXO_JSX_PORT]: 'children';
    (props: { readonly children?: never }): TExoSchemaElement;
};
// What `$` holds when no port interface was given: a `never` brand fits every position.
export type TExoJsxAnyPort = {
    readonly [EXO_JSX_PORT]: never;
    (props: { readonly children?: never }): TExoSchemaElement;
};

export type TExoOnAttrs = {
    [K in keyof HTMLElementEventMap as `on:${K}`]?: TExoJsxEventPort;
};

export type TExoCamelEventName = {
    onDblClick: 'dblclick';
    onKeyDown: 'keydown';
    onKeyUp: 'keyup';
    onKeyPress: 'keypress';
    onMouseDown: 'mousedown';
    onMouseUp: 'mouseup';
    onMouseMove: 'mousemove';
    onMouseEnter: 'mouseenter';
    onMouseLeave: 'mouseleave';
    onMouseOver: 'mouseover';
    onMouseOut: 'mouseout';
    onPointerDown: 'pointerdown';
    onPointerUp: 'pointerup';
    onPointerMove: 'pointermove';
    onPointerEnter: 'pointerenter';
    onPointerLeave: 'pointerleave';
    onPointerCancel: 'pointercancel';
    onTouchStart: 'touchstart';
    onTouchEnd: 'touchend';
    onTouchMove: 'touchmove';
    onFocusIn: 'focusin';
    onFocusOut: 'focusout';
    onContextMenu: 'contextmenu';
    onDragStart: 'dragstart';
    onDragEnd: 'dragend';
    onDragOver: 'dragover';
    onDragEnter: 'dragenter';
    onDragLeave: 'dragleave';
    onAnimationEnd: 'animationend';
    onTransitionEnd: 'transitionend';
    onBeforeInput: 'beforeinput';
    onCompositionStart: 'compositionstart';
    onCompositionEnd: 'compositionend';
};

export type TExoCamelOnAttrs = {
    [K in keyof HTMLElementEventMap as `on${Capitalize<K>}`]?: TExoJsxEventPort;
} & {
    [P in keyof TExoCamelEventName]?: TExoJsxEventPort;
};

// A literal is markup; `$.name` is a port the machine fills.
export type TExoAttrValue = string | number | boolean | TExoJsxAttrPort;

// Unescaped markup as the element's whole content, written by `c.unsafeHtml`. Nothing sanitises.
export type TExoUnsafeHtmlAttrs = {
    unsafeHtml?: TExoJsxChildrenPort;
};

export type TExoRefAttrs = {
    ref?: TExoJsxRefPort;
};

// A generous superset, not a per-tag table: `<div href>` type-checks.
export type TExoElementAttrName =
    | 'id'
    | 'class'
    | 'className'
    | 'style'
    | 'title'
    | 'role'
    | 'hidden'
    | 'lang'
    | 'dir'
    | 'translate'
    | 'slot'
    | 'part'
    | 'tabindex'
    | 'tabIndex'
    | 'draggable'
    | 'contenteditable'
    | 'contentEditable'
    | 'spellcheck'
    | 'spellCheck'
    | 'accesskey'
    | 'autocapitalize'
    | 'inputmode'
    | 'enterkeyhint'
    | 'is'
    | 'nonce'
    | 'itemscope'
    | 'itemtype'
    | 'itemprop'
    | 'itemid'
    | 'itemref'
    | 'type'
    | 'name'
    | 'value'
    | 'placeholder'
    | 'disabled'
    | 'checked'
    | 'selected'
    | 'readonly'
    | 'readOnly'
    | 'required'
    | 'multiple'
    | 'autocomplete'
    | 'autofocus'
    | 'min'
    | 'max'
    | 'step'
    | 'minlength'
    | 'maxlength'
    | 'pattern'
    | 'size'
    | 'rows'
    | 'cols'
    | 'wrap'
    | 'form'
    | 'formaction'
    | 'formmethod'
    | 'formnovalidate'
    | 'formtarget'
    | 'method'
    | 'action'
    | 'enctype'
    | 'novalidate'
    | 'accept'
    | 'accept-charset'
    | 'capture'
    | 'list'
    | 'for'
    | 'htmlFor'
    | 'label'
    | 'href'
    | 'target'
    | 'rel'
    | 'download'
    | 'hreflang'
    | 'ping'
    | 'referrerpolicy'
    | 'src'
    | 'srcset'
    | 'sizes'
    | 'alt'
    | 'width'
    | 'height'
    | 'loading'
    | 'decoding'
    | 'crossorigin'
    | 'poster'
    | 'preload'
    | 'autoplay'
    | 'loop'
    | 'muted'
    | 'controls'
    | 'playsinline'
    | 'kind'
    | 'srclang'
    | 'default'
    | 'srcdoc'
    | 'sandbox'
    | 'allow'
    | 'allowfullscreen'
    | 'colspan'
    | 'colSpan'
    | 'rowspan'
    | 'rowSpan'
    | 'headers'
    | 'scope'
    | 'span'
    | 'open'
    | 'reversed'
    | 'start'
    | 'datetime'
    | 'cite'
    | 'high'
    | 'low'
    | 'optimum'
    | 'media'
    | 'integrity'
    | 'charset'
    | 'content'
    | 'http-equiv'
    | 'property'
    | 'as'
    | 'async'
    | 'defer'
    | 'nomodule'
    | 'coords'
    | 'shape'
    | 'usemap'
    | 'ismap'
    | 'viewBox'
    | 'xmlns'
    | 'fill'
    | 'stroke'
    | 'stroke-width'
    | 'stroke-linecap'
    | 'stroke-linejoin'
    | 'fill-rule'
    | 'clip-rule'
    | 'd'
    | 'cx'
    | 'cy'
    | 'r'
    | 'x'
    | 'y'
    | 'x1'
    | 'x2'
    | 'y1'
    | 'y2'
    | 'points'
    | 'transform';

// The two index signatures are DOCUMENTATION, not enforcement: a hyphenated name is never checked.
export type TExoElementAttrs = {
    [K in TExoElementAttrName]?: TExoAttrValue;
} & {
    [attr: `data-${string}`]: TExoAttrValue;
    [attr: `aria-${string}`]: TExoAttrValue;
};

// Nothing at runtime — every element is compiled away — so this exists only to be what `exoJsx`'s
// callback returns.
export interface TExoSchemaElement {
    readonly __exoSchemaElement?: never;
}

// `string` is admitted although a bare `{expression}` child is refused: JSX text and a `{'…'}`
// child are indistinguishable here, so only the compiler can separate them.
export type TExoSchemaChild = TExoSchemaElement | TExoJsxTextPort | string;

export type TExoSchemaChildren = TExoSchemaChild | readonly TExoSchemaChild[];

// The intersection is load-bearing: one interface may not carry `'on:click'` beside an
// `on:${string}` signature, while separate members have no such rule.
export type TExoSchemaElementProps = TExoElementAttrs &
    TExoUnsafeHtmlAttrs &
    TExoRefAttrs &
    TExoOnAttrs &
    TExoCamelOnAttrs & {
        children?: TExoSchemaChildren;
    };

// Present so a `tsc` emit resolves and fails with a sentence instead of a missing export. No
// `Fragment` on purpose: the compiler refuses one, so `<></>` failing to resolve is the honest end.
function assertUncompiledJsx(...args: readonly unknown[]): never {
    void args;
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? 'Exodra schema JSX reached the runtime, which means this module was never compiled. ' +
              'Add @exodra/babel-plugin-schema to the build (or babel-preset-exodra with ' +
              "mode: 'schema'): it replaces every exoJsx(…) with a module-level schema " +
              'declaration, and there is no runtime here that could interpret an element.'
            : 'EXO0085'
    );
}

export const jsx = assertUncompiledJsx;
export const jsxs = assertUncompiledJsx;
export const jsxDEV = assertUncompiledJsx;

// eslint-disable-next-line @typescript-eslint/no-namespace -- TypeScript's JSX type resolution requires a `JSX` namespace; it cannot be expressed with ES2015 module syntax.
export namespace JSX {
    export type Element = TExoSchemaElement;

    export type ElementType = keyof IntrinsicElements | TExoJsxChildrenPort | TExoJsxAnyPort;

    // Empty rather than absent: it is intersected into every element's props.
    export type IntrinsicAttributes = Record<never, never>;

    export interface ElementChildrenAttribute {
        children: Record<never, never>;
    }

    export interface IntrinsicElements {
        div: TExoSchemaElementProps;
        span: TExoSchemaElementProps;
        p: TExoSchemaElementProps;
        h1: TExoSchemaElementProps;
        h2: TExoSchemaElementProps;
        h3: TExoSchemaElementProps;
        h4: TExoSchemaElementProps;
        h5: TExoSchemaElementProps;
        h6: TExoSchemaElementProps;
        section: TExoSchemaElementProps;
        article: TExoSchemaElementProps;
        aside: TExoSchemaElementProps;
        header: TExoSchemaElementProps;
        footer: TExoSchemaElementProps;
        main: TExoSchemaElementProps;
        nav: TExoSchemaElementProps;
        ul: TExoSchemaElementProps;
        ol: TExoSchemaElementProps;
        li: TExoSchemaElementProps;
        dl: TExoSchemaElementProps;
        dt: TExoSchemaElementProps;
        dd: TExoSchemaElementProps;
        table: TExoSchemaElementProps;
        thead: TExoSchemaElementProps;
        tbody: TExoSchemaElementProps;
        tfoot: TExoSchemaElementProps;
        tr: TExoSchemaElementProps;
        td: TExoSchemaElementProps;
        th: TExoSchemaElementProps;
        caption: TExoSchemaElementProps;
        colgroup: TExoSchemaElementProps;
        col: TExoSchemaElementProps;
        strong: TExoSchemaElementProps;
        em: TExoSchemaElementProps;
        b: TExoSchemaElementProps;
        i: TExoSchemaElementProps;
        small: TExoSchemaElementProps;
        mark: TExoSchemaElementProps;
        s: TExoSchemaElementProps;
        u: TExoSchemaElementProps;
        abbr: TExoSchemaElementProps;
        cite: TExoSchemaElementProps;
        q: TExoSchemaElementProps;
        sub: TExoSchemaElementProps;
        sup: TExoSchemaElementProps;
        code: TExoSchemaElementProps;
        pre: TExoSchemaElementProps;
        kbd: TExoSchemaElementProps;
        samp: TExoSchemaElementProps;
        var: TExoSchemaElementProps;
        br: TExoSchemaElementProps;
        hr: TExoSchemaElementProps;
        blockquote: TExoSchemaElementProps;
        figure: TExoSchemaElementProps;
        figcaption: TExoSchemaElementProps;
        details: TExoSchemaElementProps;
        summary: TExoSchemaElementProps;
        time: TExoSchemaElementProps;
        address: TExoSchemaElementProps;
        progress: TExoSchemaElementProps;
        meter: TExoSchemaElementProps;
        input: TExoSchemaElementProps;
        button: TExoSchemaElementProps;
        textarea: TExoSchemaElementProps;
        select: TExoSchemaElementProps;
        option: TExoSchemaElementProps;
        optgroup: TExoSchemaElementProps;
        form: TExoSchemaElementProps;
        label: TExoSchemaElementProps;
        fieldset: TExoSchemaElementProps;
        legend: TExoSchemaElementProps;
        datalist: TExoSchemaElementProps;
        output: TExoSchemaElementProps;
        img: TExoSchemaElementProps;
        video: TExoSchemaElementProps;
        audio: TExoSchemaElementProps;
        source: TExoSchemaElementProps;
        track: TExoSchemaElementProps;
        picture: TExoSchemaElementProps;
        svg: TExoSchemaElementProps;
        path: TExoSchemaElementProps;
        g: TExoSchemaElementProps;
        circle: TExoSchemaElementProps;
        rect: TExoSchemaElementProps;
        line: TExoSchemaElementProps;
        polyline: TExoSchemaElementProps;
        polygon: TExoSchemaElementProps;
        a: TExoSchemaElementProps;
        canvas: TExoSchemaElementProps;
        iframe: TExoSchemaElementProps;
        script: TExoSchemaElementProps;
        style: TExoSchemaElementProps;
        link: TExoSchemaElementProps;
        meta: TExoSchemaElementProps;
        title: TExoSchemaElementProps;
    }
}
