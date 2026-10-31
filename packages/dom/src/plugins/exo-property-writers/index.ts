// `takesOverExoProperty` is exported as the default predicate, so a narrower rule can be written as
// "the default, and also…". What this pack refuses, and what it gives up (the server is not
// composed), is in `../README.md` § exo-property-writers.
export { createExoPropertyWriters } from './factories/createExoPropertyWriters';
export { withExoPropertyWriters } from './withExoPropertyWriters';
export { takesOverExoProperty } from './takesOverExoProperty';
export { EXO_GLOBAL_ATTRIBUTES } from './constants/EXO_GLOBAL_ATTRIBUTES';
