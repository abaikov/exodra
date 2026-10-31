import { describe, expect, it } from 'vitest';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { mountExoReactTree } from './helpers/mountExoReactTree';
import { clickExoReactElement } from './helpers/clickExoReactElement';
import { waitForExoReactCondition } from './helpers/waitForExoReactCondition';

describe('@headlessui/react', () => {
    it('toggles a Disclosure panel and its aria-expanded through the button', async () => {
        const { container, unmount } = await mountExoReactTree(
            <Disclosure>
                <DisclosureButton>details</DisclosureButton>
                <DisclosurePanel>
                    {({ open }) => <p className="panel">{open ? 'open panel' : 'closed panel'}</p>}
                </DisclosurePanel>
            </Disclosure>
        );
        const button = container.querySelector('button') as HTMLButtonElement;
        expect(button.getAttribute('aria-expanded')).toBe('false');
        expect(container.querySelector('.panel')).toBeNull();

        await clickExoReactElement(button);
        await waitForExoReactCondition(
            () => container.querySelector('.panel')?.textContent === 'open panel'
        );
        expect(button.getAttribute('aria-expanded')).toBe('true');
        expect(button.getAttribute('aria-controls')).toBe(
            container.querySelector('.panel')?.parentElement?.id
        );

        await clickExoReactElement(button);
        await waitForExoReactCondition(() => container.querySelector('.panel') === null);
        expect(button.getAttribute('aria-expanded')).toBe('false');

        await unmount();
    });
});
