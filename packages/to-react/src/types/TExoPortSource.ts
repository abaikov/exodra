export type TExoPortSource = {
    readonly name: string;
    readonly kind: 'attr' | 'text' | 'event' | 'children' | 'ref' | 'html';
    readonly attribute: string | null;
    readonly event: string | null;
};
