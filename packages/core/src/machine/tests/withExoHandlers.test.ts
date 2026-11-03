import { expect, it } from 'vitest';
import { exoContextToken } from '@exodra/context';
import { composeExoMachine } from '../composeExoMachine';
import { createExoMachine } from '../factories/createExoMachine';
import { withExoHandlers } from '../withExoHandlers';
import { createExoSchema } from '../../schema/factories/createExoSchema';
import { exoPorts } from '../../schema/ports/factories/exoPorts';
import { EXO_PORT_EVENT } from '../../schema/ports/constants/EXO_PORT_EVENT';
import type { TExoBaseNodeMethods } from '../../wiring/types/TExoBaseNodeMethods';

const Ports = exoPorts({ PRESS: EXO_PORT_EVENT, OTHER: EXO_PORT_EVENT });
const Schema = createExoSchema(Ports, (b) => {
    b.el('div', null, (div) => {
        div.el('button', null, (button) => button.eventPort(Ports.PRESS, 'click'));
        div.el('button', null, (button) => button.eventPort(Ports.OTHER, 'click'));
    });
});

it('refuses a second handler on an event port, in one step or across steps', () => {
    expect(() =>
        withExoHandlers(createExoMachine(Schema), (on) => {
            on(Ports.PRESS, () => undefined);
            on(Ports.PRESS, () => undefined);
        })
    ).toThrow(/already has a handler/);
    expect(() =>
        composeExoMachine(
            createExoMachine(Schema),
            (m) => withExoHandlers(m, (on) => on(Ports.PRESS, () => undefined)),
            (m) => withExoHandlers(m, (on) => on(Ports.PRESS, () => undefined))
        )
    ).toThrow(/already has a handler/);
    const both = composeExoMachine(
        createExoMachine(Schema),
        (m) => withExoHandlers(m, (on) => on(Ports.PRESS, () => undefined)),
        (m) => withExoHandlers(m, (on) => on(Ports.OTHER, () => undefined))
    );
    expect(both.handlers.map((handler) => handler.port)).toEqual([Ports.PRESS, Ports.OTHER]);
});

it('types provide strictly against its token: a wider value does not compile', () => {
    const Token = exoContextToken<{ readonly id: number }>('id');
    const provide: TExoBaseNodeMethods['provide'] = () => undefined;
    provide(Token, { id: 1 });
    // @ts-expect-error a value of a wider type than the token's
    provide(Token, { id: 1 } as { readonly id: number } | null);
});
