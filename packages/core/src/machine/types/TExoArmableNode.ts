export type TExoArmableNode = {
    armExoSelf(params: unknown): void;
    deferExoTransition(
        run: (enode: never, first: unknown, second: unknown) => void,
        first: unknown,
        second: unknown
    ): boolean;
};
