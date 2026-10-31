import { ExoReactComponent } from './ExoReactComponent';

export class ExoReactPureComponent<
    TProps = Record<string, unknown>,
    TState = Record<string, unknown>
> extends ExoReactComponent<TProps, TState> {
    static readonly isPureReactComponent = true;
}
