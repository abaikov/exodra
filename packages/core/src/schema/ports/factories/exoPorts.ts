import { assertExoPortKindMark } from '../asserts/assertExoPortKindMark';
import { createExoPortOfKind } from './createExoPortOfKind';
import type { TExoAnyPort } from '../types/TExoAnyPort';
import type { TExoDeclaredPorts } from '../types/TExoDeclaredPorts';
import type { TExoPortKindMark } from '../types/TExoPortKindMark';

export function exoPorts<TDecl extends Readonly<Record<string, TExoPortKindMark>>>(
    declared: TDecl
): TExoDeclaredPorts<TDecl> {
    const ports: Record<string, TExoAnyPort> = {};
    let index = 0;
    for (const name in declared) {
        const mark = declared[name];
        assertExoPortKindMark(mark);
        ports[name] = createExoPortOfKind(mark, index, null);
        index++;
    }
    return ports as TExoDeclaredPorts<TDecl>;
}
