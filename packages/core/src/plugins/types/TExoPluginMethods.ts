export type TExoPluginMethods<TPack> = TPack extends (base: never) => infer TComposed
    ? TComposed
    : {
          [K in keyof TPack]: TPack[K] extends (next: never) => infer TMethod ? TMethod : never;
      };
