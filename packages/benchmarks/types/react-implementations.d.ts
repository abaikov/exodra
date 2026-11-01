declare module '*/apps/react/react.tsx?impl=preact' {
    export const ReactApp: (props: { slot: { value: unknown } }) => unknown;
}

declare module '*/apps/react/react.tsx?impl=compat' {
    export const ReactApp: (props: { slot: { value: unknown } }) => unknown;
}

declare module '*/apps/react/react.tsx?impl=compatCalls' {
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

declare module '*/apps/react-libraries/libraryList.ts?impl=compat' {
    export const createLibraryListApp: () => {
        readonly app: unknown;
        advance(round: number): void;
    };
}

declare module '*/apps/react-libraries/libraryListJsx.jsx' {
    export const createLibraryListJsxApp: () => {
        readonly app: unknown;
        advance(round: number): void;
    };
}
