import type { TExoReactHostTemplateOp } from './TExoReactHostTemplateOp';

export type TExoReactHostTemplatePlan = {
    claims: number;
    value: number;
    readonly regions: number[];
    readonly events: number[];
    readonly parts: number[];
    readonly ops: { readonly op: TExoReactHostTemplateOp; readonly claim: number }[];
};
