import { describe, expect, it } from 'vitest';
import { act } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { mountExoReactTree } from './helpers/mountExoReactTree';
import { clickExoReactElement } from './helpers/clickExoReactElement';
import { waitForExoReactCondition } from './helpers/waitForExoReactCondition';

describe('@radix-ui/react-dialog', () => {
    it('opens through the trigger into a portal and closes on Escape', async () => {
        const { container, unmount } = await mountExoReactTree(
            <Dialog.Root>
                <Dialog.Trigger>open</Dialog.Trigger>
                <Dialog.Portal>
                    <Dialog.Overlay className="overlay" />
                    <Dialog.Content>
                        <Dialog.Title>Settings</Dialog.Title>
                        <Dialog.Description>Change your settings.</Dialog.Description>
                        <Dialog.Close>close</Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        );
        const trigger = container.querySelector('button') as HTMLButtonElement;
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(document.querySelector('[role="dialog"]')).toBeNull();

        await clickExoReactElement(trigger);
        const dialog = document.querySelector('[role="dialog"]');
        expect(dialog).not.toBeNull();
        expect(container.contains(dialog)).toBe(false);
        expect(dialog?.getAttribute('data-state')).toBe('open');
        expect(dialog?.querySelector('h2')?.textContent).toBe('Settings');
        expect(dialog?.getAttribute('aria-labelledby')).toBe(dialog?.querySelector('h2')?.id);
        expect(trigger.getAttribute('aria-expanded')).toBe('true');

        await act(async () => {
            dialog?.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
            );
        });
        await waitForExoReactCondition(() => document.querySelector('[role="dialog"]') === null);
        expect(trigger.getAttribute('aria-expanded')).toBe('false');

        await clickExoReactElement(trigger);
        await clickExoReactElement(document.querySelector('[role="dialog"] button'));
        await waitForExoReactCondition(() => document.querySelector('[role="dialog"]') === null);

        await unmount();
    });
});
