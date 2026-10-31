// The property names whose markup form holds a STRING; every other name in `EXO_DOM_PROPERTIES` is
// a boolean whose markup form is the attribute's PRESENCE, which is therefore the default. A name
// added there and forgotten here would print `disabled="false"` — a disabled control on a served
// page. Nothing cross-checks this.
export const EXO_STRING_PROPERTY_NAMES: ReadonlySet<string> = new Set(['value']);
