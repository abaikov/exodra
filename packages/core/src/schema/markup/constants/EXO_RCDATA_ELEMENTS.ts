/** SEPARATE from `EXO_RAW_TEXT_ELEMENTS` because RCDATA decodes character references — see the README. */
export const EXO_RCDATA_ELEMENTS: ReadonlySet<string> = new Set(['textarea', 'title']);
