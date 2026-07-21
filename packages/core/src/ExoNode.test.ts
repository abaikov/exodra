import { describe, expect, it } from 'vitest';
import { createContextKey } from './factory/createContextKey';
import { ExoNode } from './ExoNode';
import type { TExoNodeSchema } from './types/TExoNodeSchema';

type TTestSchema = TExoNodeSchema<
    string,
    {
        children?: readonly TTestSchema[];
    }
>;

class TestNode extends ExoNode<TTestSchema> {
    protected override resolveChildren(): readonly TTestSchema[] {
        return this.schema.attrs.children ?? [];
    }
}

describe('ExoNode', () => {
    it('creates child nodes with the same runtime class', () => {
        const schema: TTestSchema = {
            type: 'root',
            attrs: {
                children: [
                    { type: 'child-a', attrs: {} },
                    { type: 'child-b', attrs: {} },
                ],
            },
        };

        const node = new TestNode(schema);

        expect(node.children).toHaveLength(2);
        expect(node.children[0]).toBeInstanceOf(TestNode);
        expect(node.children[1]?.schema.type).toBe('child-b');
    });

    it('executes component node types with context', () => {
        type TComponentSchema = TExoNodeSchema<
            | string
            | ((context: {
                  createNode(schema: TComponentSchema): TComponentSchema;
              }) => TComponentSchema),
            { children?: readonly TComponentSchema[]; label?: string }
        >;
        class ComponentNode extends ExoNode<TComponentSchema> {
            protected override resolveChildren(): readonly TComponentSchema[] {
                return this.schema.attrs.children ?? super.resolveChildren();
            }
        }
        const child: TComponentSchema = {
            type: 'child',
            attrs: {
                label: 'created',
            },
        };
        const component = (context: {
            createNode(schema: TComponentSchema): TComponentSchema;
        }) => context.createNode(child);

        const node = new ComponentNode({
            type: component,
            attrs: {},
        });

        expect(node.children).toHaveLength(1);
        expect(node.children[0]?.schema).toBe(child);
    });

    it('runs component context cleanup on dispose', () => {
        let cleanupCalls = 0;

        type TComponentSchema = TExoNodeSchema<
            | string
            | ((context: {
                  onDispose(cleanup: () => void): void;
              }) => TComponentSchema),
            { children?: readonly TComponentSchema[] }
        >;

        class ComponentNode extends ExoNode<TComponentSchema> {
            protected override resolveChildren(): readonly TComponentSchema[] {
                return this.schema.attrs.children ?? super.resolveChildren();
            }
        }

        const node = new ComponentNode({
            type: context => {
                context.onDispose(() => {
                    cleanupCalls += 1;
                });

                return {
                    type: 'child',
                    attrs: {},
                };
            },
            attrs: {},
        });

        expect(cleanupCalls).toBe(0);

        node.dispose();

        expect(cleanupCalls).toBe(1);
    });

    it('provides scoped context values to descendants', () => {
        const labelKey = createContextKey<string>('label');

        type TComponentSchema = TExoNodeSchema<
            | string
            | ((context: {
                  createNode(schema: TComponentSchema): TComponentSchema;
                  provide(key: typeof labelKey, value: string): void;
                  inject(key: typeof labelKey): string | undefined;
              }) => TComponentSchema),
            { children?: readonly TComponentSchema[]; label?: string }
        >;

        class ComponentNode extends ExoNode<TComponentSchema> {
            protected override resolveChildren(): readonly TComponentSchema[] {
                return this.schema.attrs.children ?? super.resolveChildren();
            }
        }

        const Consumer = (context: {
            inject(key: typeof labelKey): string | undefined;
        }): TComponentSchema => ({
            type: 'leaf',
            attrs: {
                label: context.inject(labelKey),
            },
        });

        const node = new ComponentNode({
            type: context => {
                context.provide(labelKey, 'from-provider');

                return context.createNode({
                    type: Consumer,
                    attrs: {},
                });
            },
            attrs: {},
        });

        expect(node.children[0]?.children[0]?.schema.attrs.label).toBe(
            'from-provider'
        );
    });

    it('reads typed attribute buckets from component context', () => {
        const textBinding = { getValue: () => 'hello' };
        const childrenList = { snapshot: () => [] };

        type TComponentSchema = TExoNodeSchema<
            | string
            | ((context: {
                  getConstant<TValue>(name: string): TValue | undefined;
                  getBindable<TValue>(name: string): TValue | undefined;
                  getBindableList<TValue>(name: string): TValue | undefined;
              }) => TComponentSchema),
            {
                static?: { label?: string };
                bindables?: { textContent?: typeof textBinding };
                bindableLists?: { children?: typeof childrenList };
                label?: string;
                text?: string;
                hasChildren?: boolean;
            }
        >;

        const node = new ExoNode<TComponentSchema>({
            type: context => ({
                type: 'leaf',
                attrs: {
                    label: context.getConstant<string>('label'),
                    text: context
                        .getBindable<typeof textBinding>('textContent')
                        ?.getValue(),
                    hasChildren: Boolean(
                        context.getBindableList<typeof childrenList>('children')
                    ),
                },
            }),
            attrs: {
                static: {
                    label: 'constant-prop',
                },
                bindables: {
                    textContent: textBinding,
                },
                bindableLists: {
                    children: childrenList,
                },
            },
        });

        expect(node.children[0]?.schema.attrs).toMatchObject({
            label: 'constant-prop',
            text: 'hello',
            hasChildren: true,
        });
    });
});
