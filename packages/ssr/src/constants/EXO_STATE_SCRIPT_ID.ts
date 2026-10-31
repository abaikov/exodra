// A constant because the protocol has two ends in different files — `renderStateScript` writes it,
// `readExoStateScript` looks it up — and two literals disagreeing fails SILENTLY: a reader finding
// no element cannot tell that from a page that transferred no state.
export const EXO_STATE_SCRIPT_ID = '__EXODRA_STATE__';
