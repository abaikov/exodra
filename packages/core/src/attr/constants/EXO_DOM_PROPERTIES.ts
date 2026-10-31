import { EXO_DOM_PROPERTY_TAGS } from './EXO_DOM_PROPERTY_TAGS';

// DERIVED, NOT WRITTEN: this is exactly "does ANY tag answer true" over `EXO_DOM_PROPERTY_TAGS`,
// and it was a second hand-written copy of those four answers with no rule anywhere that the two
// had to agree. Built once per process — four names, seven pairs — and read only inside functions,
// never at another module's load.
const BY_NAME: Record<string, boolean> = Object.create(null) as Record<string, boolean>;
EXO_DOM_PROPERTY_TAGS.forEach((tags, name) => {
    let expressible = false;
    tags.forEach((markup) => {
        if (markup) expressible = true;
    });
    BY_NAME[name] = expressible;
});

/**
 * `false` means the property has NO markup form: the string backend emits nothing and hydration
 * still has to apply it. NULL-PROTOTYPE, so a reader holding a non-literal name needs no
 * `hasOwnProperty` guard: `EXO_DOM_PROPERTIES['constructor']` is a miss, not Object's method.
 */
export const EXO_DOM_PROPERTIES: Readonly<Record<string, boolean>> = BY_NAME;
