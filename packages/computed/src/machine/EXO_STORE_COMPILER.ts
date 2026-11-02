import type { TExoPortCompiler } from '@exodra/core';
import type { TExoCommitNode } from '../computed/types/TExoCommitNode';

export type TExoPortStore<TState extends TExoCommitNode> = (enode: TState, value: unknown) => void;

function refuse(what: string, instead: string): never {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `withExoComputedMachine: a derivation cannot fill ${what} — use ${instead}.`
            : 'EXO0081'
    );
}

export const EXO_STORE_COMPILER: TExoPortCompiler<TExoPortStore<TExoCommitNode>> = {
    attribute: (port) => (enode, value) => enode.attr(port, value),
    text: (port) => (enode, value) => enode.text(port, value),
    children: (port) => (enode, value) => enode.unsafeHtml(port, value),
    event: () =>
        refuse(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? 'an EVENT port'
                : '',
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? 'on(port, handler)'
                : ''
        ),
    ref: () =>
        refuse(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? 'a REF port'
                : '',
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? 'portNodeReader() to READ the node'
                : ''
        ),
};
