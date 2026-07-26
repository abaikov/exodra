// Type-level guard for the JSX handler-inference regression: intrinsic handler
// params must INFER their event type from the element. If inference breaks, a bare
// `e =>` param becomes implicit `any` → strict `noImplicitAny` fails the build here;
// and the `.currentTarget.value` reads require `e` to be the RIGHT element event, so
// a wrong element type fails too. `tsc --noEmit` (the `test:types` script) is the test.
import type { ExoEvent, ExoInputEvent, ExoEventHandlers } from '@exodra/jsx';

// --- 1. Intrinsic handler-param inference (the exact `e: any` regression) ------
export const _input = (
    <input
        static={{ class: 'field' }}
        handlers={{
            onInput: e => {
                const v: string = e.currentTarget.value; // input → currentTarget is HTMLInputElement
                return v;
            },
        }}
    />
);

export const _select = (
    <select
        handlers={{
            onChange: e => {
                const v: string = e.currentTarget.value; // select → HTMLSelectElement
                return v;
            },
        }}
    />
);

export const _button = (
    <button
        handlers={{
            onClick: e => {
                const t: string = e.currentTarget.tagName; // any element
                return t;
            },
        }}
    />
);

// --- 2. Explicit ExoEvent aliases narrow currentTarget ------------------------
const onSearch = (e: ExoInputEvent): string => e.currentTarget.value;
void onSearch;

type _CurrentTarget = ExoEvent<HTMLInputElement>['currentTarget'];
const _ct: _CurrentTarget = null as unknown as HTMLInputElement;
void _ct;

type _OnInputParam =
    NonNullable<ExoEventHandlers<HTMLInputElement>['onInput']> extends (e: infer E) => unknown
        ? E
        : never;
const _param = null as unknown as _OnInputParam;
const _paramValue: string = _param.currentTarget.value; // param carries the input element
void _paramValue;

// --- 3. Flat (non-bucketed) props are rejected --------------------------------
// @ts-expect-error `class` must live in the `static` bucket, not as a flat prop
export const _flatClass = <div class="x" />;
// @ts-expect-error `onClick` must live in the `handlers` bucket, not flat
export const _flatHandler = <button onClick={() => {}} />;
