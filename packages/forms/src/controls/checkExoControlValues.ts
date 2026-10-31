import type { TExoControlRule } from '../types/TExoControlRule';
import type { TExoControlValue } from '../types/TExoControlValue';

export function checkExoControlValues(
    values: readonly (TExoControlValue | undefined)[],
    rules: readonly (TExoControlRule | null)[]
): (string | null)[] {
    const errors = new Array<string | null>(rules.length);
    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        errors[i] = rule === null ? null : rule(values[i], values);
    }
    return errors;
}
