import { EXO_REACT_HOST_ADOPTION } from '../constants/EXO_REACT_HOST_ADOPTION';
import { EXO_REACT_SYMBOLS } from '../constants/EXO_REACT_SYMBOLS';
import { adoptExoReactHostSlot } from './adoptExoReactHostSlot';
import type { TExoReactElement } from '../types/TExoReactElement';
import type { TExoReactHostElement } from '../types/TExoReactHostElement';

type TExoReactCompiledHost = {
    readonly exoReactTag: string;
    readonly exoReactSource: (values: readonly unknown[]) => TExoReactElement;
};

class ExoReactHostElement implements TExoReactHostElement {
    readonly $$typeof = EXO_REACT_SYMBOLS.element;
    readonly type: string;
    readonly ref = null;
    private built: TExoReactElement | null = null;

    constructor(
        readonly host: TExoReactCompiledHost,
        readonly values: readonly unknown[],
        readonly key: string | null
    ) {
        this.type = host.exoReactTag;
    }

    get source(): TExoReactElement {
        return (this.built ??= this.host.exoReactSource(this.values));
    }

    get props(): Readonly<Record<string, unknown>> {
        return this.source.props;
    }
}

EXO_REACT_HOST_ADOPTION.adopt = adoptExoReactHostSlot;

export function createExoReactHostElement(
    host: unknown,
    values: readonly unknown[],
    key?: unknown
): TExoReactHostElement {
    return new ExoReactHostElement(
        host as TExoReactCompiledHost,
        values,
        key === undefined || key === null ? null : String(key)
    );
}
