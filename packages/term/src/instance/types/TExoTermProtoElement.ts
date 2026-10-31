// A prototype TREE, not the list of pieces `@exodra/string` compiles to: a markup backend can
// flatten because nothing is ever revisited, a RETAINED one must hand back a writable structure.
// `ports` is every port targeting THIS element, so `set` becomes two array loads, not a walk.
export type TExoTermProtoElement = {
    readonly tag: string;
    // Already under their markup spelling, copied into every instance.
    readonly attrs: Readonly<Record<string, string>>;
    readonly ports: readonly number[];
    // The schema's `content !== null`, so an instance starts at `text = ''` rather than `null`.
    readonly hasContent: boolean;
    readonly kids: readonly TExoTermProtoKid[];
};

export type TExoTermProtoRegion = {
    readonly port: number;
};

// Shared with every instance, because nothing ever writes it.
export type TExoTermProtoText = {
    readonly text: string;
};

export type TExoTermProtoKid = TExoTermProtoElement | TExoTermProtoText | TExoTermProtoRegion;
