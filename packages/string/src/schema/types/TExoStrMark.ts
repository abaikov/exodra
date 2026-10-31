// Which backend made this node. THE CHECK HAS TO LIVE IN THE TYPES: `bindChildren` is
// `html += children[i]`, a loop that cannot fail because everything concatenates, so a value from
// another backend reaches the page as the literal text `[object Object]`, silently.
declare const EXO_STR_MARK: unique symbol;

export type TExoStrMark = {
    readonly [EXO_STR_MARK]: true;
};
