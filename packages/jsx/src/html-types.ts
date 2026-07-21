// HTML intrinsic element types for proper JSX autocomplete and type safety

export interface HTMLElementProps {
    // Global HTML attributes
    id?: string;
    className?: string;
    class?: string; // Support both className and class
    style?: string | Record<string, string | number>;
    title?: string;
    lang?: string;
    dir?: 'ltr' | 'rtl' | 'auto';
    hidden?: boolean;
    tabIndex?: number;
    accessKey?: string;
    contentEditable?: boolean | 'true' | 'false';
    draggable?: boolean;
    spellCheck?: boolean;
    translate?: 'yes' | 'no';

    // ARIA attributes
    role?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    'aria-expanded'?: boolean;
    'aria-hidden'?: boolean;
    'aria-disabled'?: boolean;
    'aria-required'?: boolean;
    'aria-live'?: 'off' | 'polite' | 'assertive';

    // Data attributes
    [key: `data-${string}`]: string | number | boolean | undefined;

    // Event handlers
    onClick?: (event: MouseEvent) => void;
    onMouseDown?: (event: MouseEvent) => void;
    onMouseUp?: (event: MouseEvent) => void;
    onMouseEnter?: (event: MouseEvent) => void;
    onMouseLeave?: (event: MouseEvent) => void;
    onMouseOver?: (event: MouseEvent) => void;
    onMouseOut?: (event: MouseEvent) => void;
    onFocus?: (event: FocusEvent) => void;
    onBlur?: (event: FocusEvent) => void;
    onKeyDown?: (event: KeyboardEvent) => void;
    onKeyUp?: (event: KeyboardEvent) => void;
    onKeyPress?: (event: KeyboardEvent) => void;
    onChange?: (event: Event) => void;
    onInput?: (event: Event) => void;
    onSubmit?: (event: Event) => void;
    onLoad?: (event: Event) => void;
    onError?: (event: Event) => void;
    onScroll?: (event: Event) => void;
    onResize?: (event: Event) => void;
}

export interface InputElementProps extends HTMLElementProps {
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 
           'date' | 'time' | 'datetime-local' | 'month' | 'week' | 
           'checkbox' | 'radio' | 'file' | 'submit' | 'reset' | 'button' | 'hidden';
    value?: string | number;
    defaultValue?: string | number;
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    checked?: boolean;
    defaultChecked?: boolean;
    min?: string | number;
    max?: string | number;
    step?: string | number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    autocomplete?: string;
    autoFocus?: boolean;
    multiple?: boolean;
    size?: number;
    accept?: string;
    capture?: boolean | 'user' | 'environment';
    name?: string;
    form?: string;
}

export interface ButtonElementProps extends HTMLElementProps {
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    autoFocus?: boolean;
    form?: string;
    name?: string;
    value?: string;
}

export interface AnchorElementProps extends HTMLElementProps {
    href?: string;
    target?: '_blank' | '_self' | '_parent' | '_top';
    rel?: string;
    download?: string | boolean;
    ping?: string;
    hreflang?: string;
    media?: string;
    referrerPolicy?: string;
}

export interface FormElementProps extends HTMLElementProps {
    action?: string;
    method?: 'get' | 'post' | 'dialog';
    encType?: 'application/x-www-form-urlencoded' | 'multipart/form-data' | 'text/plain';
    target?: '_blank' | '_self' | '_parent' | '_top';
    autoComplete?: 'on' | 'off';
    noValidate?: boolean;
    acceptCharset?: string;
    name?: string;
}

export interface LabelElementProps extends HTMLElementProps {
    htmlFor?: string;
    form?: string;
}

export interface TextareaElementProps extends HTMLElementProps {
    value?: string;
    defaultValue?: string;
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    rows?: number;
    cols?: number;
    minLength?: number;
    maxLength?: number;
    wrap?: 'hard' | 'soft';
    autoFocus?: boolean;
    name?: string;
    form?: string;
}

export interface SelectElementProps extends HTMLElementProps {
    value?: string | string[];
    defaultValue?: string | string[];
    disabled?: boolean;
    required?: boolean;
    multiple?: boolean;
    size?: number;
    autoFocus?: boolean;
    name?: string;
    form?: string;
}

export interface OptionElementProps extends HTMLElementProps {
    value?: string;
    disabled?: boolean;
    selected?: boolean;
    label?: string;
}

export interface ImageElementProps extends HTMLElementProps {
    src?: string;
    alt?: string;
    width?: number | string;
    height?: number | string;
    loading?: 'lazy' | 'eager';
    decoding?: 'async' | 'sync' | 'auto';
    crossOrigin?: 'anonymous' | 'use-credentials';
    referrerPolicy?: string;
    srcSet?: string;
    sizes?: string;
    useMap?: string;
}

export interface VideoElementProps extends HTMLElementProps {
    src?: string;
    poster?: string;
    width?: number | string;
    height?: number | string;
    controls?: boolean;
    autoPlay?: boolean;
    loop?: boolean;
    muted?: boolean;
    preload?: 'none' | 'metadata' | 'auto';
    crossOrigin?: 'anonymous' | 'use-credentials';
}

export interface AudioElementProps extends HTMLElementProps {
    src?: string;
    controls?: boolean;
    autoPlay?: boolean;
    loop?: boolean;
    muted?: boolean;
    preload?: 'none' | 'metadata' | 'auto';
    crossOrigin?: 'anonymous' | 'use-credentials';
}