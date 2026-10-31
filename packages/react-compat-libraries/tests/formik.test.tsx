import { describe, expect, it } from 'vitest';
import { Field, Form, Formik } from 'formik';
import { mountExoReactTree } from './helpers/mountExoReactTree';
import { clickExoReactElement } from './helpers/clickExoReactElement';
import { typeIntoExoReactField } from './helpers/typeIntoExoReactField';
import { waitForExoReactCondition } from './helpers/waitForExoReactCondition';

type TFields = { name: string };

describe('formik', () => {
    it('keeps a controlled Field in state and submits the typed value', async () => {
        const submitted: TFields[] = [];

        const { container, unmount } = await mountExoReactTree(
            <Formik<TFields>
                initialValues={{ name: '' }}
                onSubmit={(values) => void submitted.push(values)}
            >
                {({ values }) => (
                    <Form>
                        <Field name="name" />
                        <output>{values.name}</output>
                        <button type="submit">send</button>
                    </Form>
                )}
            </Formik>
        );
        const input = container.querySelector('input') as HTMLInputElement;
        await typeIntoExoReactField(input, 'Grace');
        await waitForExoReactCondition(
            () => container.querySelector('output')?.textContent === 'Grace'
        );
        expect(input.value).toBe('Grace');

        await clickExoReactElement(container.querySelector('button'));
        await waitForExoReactCondition(() => submitted.length === 1);
        expect(submitted[0]).toEqual({ name: 'Grace' });

        await unmount();
    });
});
