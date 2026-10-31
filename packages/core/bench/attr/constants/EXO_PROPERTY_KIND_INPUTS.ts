import type { TExoPropertyKindInput } from '../types/TExoPropertyKindInput';

const HIT_TRUE: readonly [string, string] = ['input', 'value'];
const HIT_FALSE: readonly [string, string] = ['textarea', 'value'];
const TAG_MISS: readonly [string, string] = ['div', 'value'];
const NAME_MISS: readonly [string, string] = ['input', 'disabled'];
const STRANGER: readonly [string, string] = ['div', 'data-deck-id'];

// A lookup that is fast only on its hit case is not fast. The first five are the three answers the
// table can give and the two ways it can miss; the sixth is the one input where `toLowerCase`
// cannot hand back its argument, and the seventh is the only one a schema compile really walks.
export const EXO_PROPERTY_KIND_INPUTS: readonly TExoPropertyKindInput[] = [
    {
        name: 'hit·true',
        pairs: [HIT_TRUE],
        why: 'the answer both compilers branch on — a property markup CAN express',
    },
    {
        name: 'hit·false',
        pairs: [HIT_FALSE],
        why: 'the second consequence: the server prints nothing and hydration repairs it',
    },
    {
        name: 'tag·miss',
        pairs: [TAG_MISS],
        why: 'the attribute IS in the table, the tag is not — the second lookup decides',
    },
    {
        name: 'name·miss',
        pairs: [NAME_MISS],
        why: 'a real HTML attribute the table does not list — the first lookup decides',
    },
    {
        name: 'stranger',
        pairs: [STRANGER],
        why: 'nothing like the table, and the shape almost every declared port actually has',
    },
    {
        name: 'UPPER·tag',
        pairs: [['INPUT', 'value']],
        why: 'the one input where `toLowerCase` cannot return its argument',
    },
    {
        name: 'mixed',
        pairs: [HIT_TRUE, HIT_FALSE, TAG_MISS, NAME_MISS, STRANGER],
        why: 'the five shapes in rotation — what a schema compile walking a real declaration asks',
    },
];
