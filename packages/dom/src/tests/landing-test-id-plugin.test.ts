// @vitest-environment jsdom
import { expect, it } from 'vitest';
import {
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    composeExoMachine,
    composeExoPlugins,
    createExoMachine,
    createExoNamedSchema,
    createExoSchema,
    exoPorts,
    withExoHandlers,
    withExoWire,
} from '@exodra/core';
import type { TExoEventHandler, TExoEventPort, TExoRefPort } from '@exodra/core';
import { ExoDomBackend, withExoCompiler, withExoHydration } from '@exodra/dom';
import type { TExoDomInstanceRecord, TExoDomNode } from '@exodra/dom';

type TOn = (
    this: TExoDomNode & TExoDomInstanceRecord,
    port: TExoEventPort,
    handler: TExoEventHandler<Event, Element>,
    subject?: unknown
) => void;

const stamp = (next: TOn): TOn =>
    function (port, handler, subject) {
        next.call(this, port, handler, subject);
        const name = this.schema.portNames[port.index];
        if (name !== null) {
            this.portNode(port as unknown as TExoRefPort).setAttribute('data-testid', name);
        }
    };

function withExoTestIds<TBackend extends object>(backend: TBackend): TBackend {
    composeExoPlugins(backend, { on: stamp });
    const surface = (backend as { hydrateSurface?: object }).hydrateSurface;
    if (surface !== undefined) composeExoPlugins(surface, { on: stamp });
    return backend;
}

const CounterPorts = exoPorts({ COUNT: EXO_PORT_TEXT, INCREMENT: EXO_PORT_EVENT });
const CounterSchema = createExoSchema(CounterPorts, (b) => {
    b.el('div', { class: 'counter' }, (div) => {
        div.el('span', null, (span) => span.textPort(CounterPorts.COUNT));
        div.el('button', null, (button) => {
            button.eventPort(CounterPorts.INCREMENT, 'click');
            button.text('+1');
        });
    });
});
const counterBase = createExoMachine(CounterSchema, {
    createInitialState: (_c: TExoDomNode) => ({ count: 0 }),
});
const counterMachine = composeExoMachine(
    counterBase,
    (m) => withExoWire(m, (c) => c.text(CounterPorts.COUNT, String(c.state.count))),
    (m) =>
        withExoHandlers(m, (on) => {
            on(CounterPorts.INCREMENT, (c) => {
                c.state.count += 1;
                c.text(CounterPorts.COUNT, String(c.state.count));
            });
        })
);

const STAMPED =
    '<div class="counter"><span>0</span><button data-testid="INCREMENT">+1</button></div>';
const PLAIN = '<div class="counter"><span>0</span><button>+1</button></div>';

it('stamps data-testid from the port name the compiled schema carries, with no port record handed in', () => {
    const root = document.createElement('div');
    withExoTestIds(withExoCompiler(new ExoDomBackend())).render(counterMachine, root);
    expect(root.innerHTML).toBe(STAMPED);
    (root.querySelector('[data-testid="INCREMENT"]') as HTMLButtonElement).click();
    expect(root.querySelector('span')?.textContent).toBe('1');

    const plain = document.createElement('div');
    withExoCompiler(new ExoDomBackend()).render(counterMachine, plain);
    expect(plain.innerHTML).toBe(PLAIN);
});

it('stamps a hydrated page too, because the plugin also wraps the adopting surface', () => {
    const container = document.createElement('div');
    container.innerHTML = PLAIN;
    withExoTestIds(withExoHydration(withExoCompiler(new ExoDomBackend()))).hydrate(
        counterMachine,
        container
    );
    expect(container.innerHTML).toBe(STAMPED);
});

it.each([
    [
        'named in the markup',
        createExoNamedSchema<{ INCREMENT: TExoEventPort }>((b) => {
            b.el('button', null, (button) => {
                button.eventPort('click', 'INCREMENT');
            });
        }),
    ],
    [
        'returned as a record',
        createExoSchema((b) => {
            let increment!: TExoEventPort;
            b.el('button', null, (button) => {
                increment = button.eventPort('click');
            });
            return { INCREMENT: increment };
        }),
    ],
])('takes the port name from a schema whose ports are %s', (_label, schema) => {
    const root = document.createElement('div');
    withExoTestIds(withExoCompiler(new ExoDomBackend())).render(
        composeExoMachine(createExoMachine(schema), (m) =>
            withExoHandlers(m, (on) => on(schema.ports.INCREMENT, () => undefined))
        ),
        root
    );
    expect(root.innerHTML).toBe('<button data-testid="INCREMENT"></button>');
});
