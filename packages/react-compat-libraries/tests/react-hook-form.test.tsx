import { describe, expect, it } from 'vitest';
import { useForm } from 'react-hook-form';
import { mountExoReactTree } from './helpers/mountExoReactTree';
import { clickExoReactElement } from './helpers/clickExoReactElement';
import { typeIntoExoReactField } from './helpers/typeIntoExoReactField';
import { waitForExoReactCondition } from './helpers/waitForExoReactCondition';

type TFields = { name: string; email: string };

describe('react-hook-form', () => {
    it('shows a validation error, then submits the typed values', async () => {
        const submitted: TFields[] = [];

        function SignUp() {
            const {
                register,
                handleSubmit,
                formState: { errors },
            } = useForm<TFields>({ defaultValues: { name: '', email: '' } });
            return (
                <form onSubmit={handleSubmit((values) => void submitted.push(values))}>
                    <input {...register('name')} />
                    <input {...register('email', { required: 'email is required' })} />
                    {errors.email && <p role="alert">{errors.email.message}</p>}
                    <button type="submit">send</button>
                </form>
            );
        }

        const { container, unmount } = await mountExoReactTree(<SignUp />);
        const [name, email] = Array.from(container.querySelectorAll('input'));
        await typeIntoExoReactField(name, 'Ada');

        await clickExoReactElement(container.querySelector('button'));
        await waitForExoReactCondition(
            () => container.querySelector('[role="alert"]')?.textContent === 'email is required'
        );
        expect(submitted).toHaveLength(0);

        await typeIntoExoReactField(email, 'ada@example.org');
        await clickExoReactElement(container.querySelector('button'));
        await waitForExoReactCondition(() => submitted.length === 1);
        expect(submitted[0]).toEqual({ name: 'Ada', email: 'ada@example.org' });
        await waitForExoReactCondition(() => container.querySelector('[role="alert"]') === null);

        await unmount();
    });
});
