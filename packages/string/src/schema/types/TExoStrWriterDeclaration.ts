// Which `EXO_STR_WRITERS` entry a port takes, and its arguments: a writer is a function, this is data.
export type TExoStrWriterDeclaration =
    | { readonly writer: 'attribute'; readonly name: string | null; readonly tag: string | null }
    | { readonly writer: 'stringAttr' | 'toggleAttr'; readonly name: string | null }
    | { readonly writer: 'text'; readonly eatsLeadingNewline: boolean }
    | {
          readonly writer: 'children';
          readonly ownsElement: boolean;
          readonly eatsLeadingNewline: boolean;
      }
    | { readonly writer: 'event' | 'ref' };
