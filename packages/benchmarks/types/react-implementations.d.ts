declare module '*/apps/react/react.tsx?impl=preact' {
    export const ReactApp: (props: { slot: { value: unknown } }) => unknown;
}

declare module '*/apps/react/react.tsx?impl=compat' {
    export const ReactApp: (props: { slot: { value: unknown } }) => unknown;
}

declare module '*/apps/react/react-jsx.jsx' {
    export const ReactJsxApp: (props: { slot: { value: unknown } }) => unknown;
}

declare module '*/apps/react/react-jsx.jsx?impl=million' {
    export const ReactJsxApp: (props: { slot: { value: unknown } }) => unknown;
}

declare module '*/apps/react/react-jsx.jsx?impl=reactCompiler' {
    export const ReactJsxApp: (props: { slot: { value: unknown } }) => unknown;
}
