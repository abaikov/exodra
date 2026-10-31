// Once per schema per backend, before any instance exists. HYDRATION CAN NEVER REPORT THIS ONE:
// `exoHydrateSchemaOf` is not exported, so the hydrate adapter's compile step runs the string and DOM
// compilers and stops, and a refusal belonging to the hydrate schema alone surfaces at `WIRE`. A
// blind spot of this suite, not of hydration.
export const EXO_STAGE_SCHEMA_COMPILE = 'schema-compile';
