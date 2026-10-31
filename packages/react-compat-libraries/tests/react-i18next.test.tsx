import { describe, expect, it } from 'vitest';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next, useTranslation } from 'react-i18next';
import { mountExoReactTree } from './helpers/mountExoReactTree';
import { clickExoReactElement } from './helpers/clickExoReactElement';
import { waitForExoReactCondition } from './helpers/waitForExoReactCondition';

describe('react-i18next', () => {
    it('renders t() for a key and re-renders on a language change', async () => {
        const i18n = i18next.createInstance();
        await i18n.use(initReactI18next).init({
            lng: 'en',
            fallbackLng: 'en',
            resources: {
                en: { translation: { greeting: 'Hello {{name}}' } },
                de: { translation: { greeting: 'Hallo {{name}}' } },
            },
            interpolation: { escapeValue: false },
            react: { useSuspense: false },
        });

        function Greeting() {
            const { t, i18n: active } = useTranslation();
            return (
                <div>
                    <h1>{t('greeting', { name: 'Ada' })}</h1>
                    <button onClick={() => void active.changeLanguage('de')}>de</button>
                </div>
            );
        }

        const { container, unmount } = await mountExoReactTree(
            <I18nextProvider i18n={i18n}>
                <Greeting />
            </I18nextProvider>
        );
        expect(container.querySelector('h1')?.textContent).toBe('Hello Ada');

        await clickExoReactElement(container.querySelector('button'));
        await waitForExoReactCondition(
            () => container.querySelector('h1')?.textContent === 'Hallo Ada'
        );

        await unmount();
    });
});
