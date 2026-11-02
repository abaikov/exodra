// @vitest-environment jsdom
import { expect, it } from 'vitest';
import {
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    composeExoPlugins,
    createExoMachine,
    composeExoMachine,
    withExoWire,
    withExoHandlers,
    createExoSchema,
    exoPorts,
} from '@exodra/core';
import type { TExoEventHandler, TExoEventPort, TExoRefPort } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';

type TOn = (
    this: TExoDomNode,
    port: TExoEventPort,
    handler: TExoEventHandler<Event, Element>,
    subject?: unknown
) => void;

function withExoTestIds<TBackend extends object>(
    backend: TBackend,
    ...portRecords: readonly Readonly<Record<string, object>>[]
): TBackend {
    const testIds = new Map<object, string>();
    for (const ports of portRecords) for (const key in ports) testIds.set(ports[key], key);
    return composeExoPlugins(backend, {
        on: (next: TOn): TOn =>
            function (port, handler, subject) {
                next.call(this, port, handler, subject);
                const testId = testIds.get(port);
                if (testId !== undefined) {
                    this.portNodeReader()(
                        this.portTable(),
                        port as unknown as TExoRefPort
                    ).setAttribute('data-testid', testId);
                }
            },
    });
}

const CounterPorts = exoPorts({ count: EXO_PORT_TEXT, increment: EXO_PORT_EVENT });
const counterSchema = createExoSchema(CounterPorts, (b) => {
    b.el('div', { class: 'counter' }, (div) => {
        div.el('span', null, (span) => span.textPort(CounterPorts.count));
        div.el('button', null, (button) => {
            button.eventPort(CounterPorts.increment, 'click');
            button.text('+1');
        });
    });
});
const counterBuilder = createExoMachine(counterSchema, {
    createInitialState: (_c: TExoDomNode) => ({ count: 0 }),
});
const Counter = composeExoMachine(
    counterBuilder,
    (m) => withExoWire(m, (c) => c.text(CounterPorts.count, String(c.state.count))),
    (m) =>
        withExoHandlers(m, (on) => {
            on(CounterPorts.increment, (c) => {
                c.state.count += 1;
                c.text(CounterPorts.count, String(c.state.count));
            });
        })
);

it('the landing page plugin stamps data-testid on handled elements only where it is composed', () => {
    const root = document.createElement('div');
    withExoTestIds(withExoCompiler(new ExoDomBackend()), CounterPorts).render(Counter, root);
    expect(root.innerHTML).toBe(
        '<div class="counter"><span>0</span><button data-testid="increment">+1</button></div>'
    );
    (root.querySelector('[data-testid="increment"]') as HTMLButtonElement).click();
    expect(root.querySelector('span')?.textContent).toBe('1');
    const plain = document.createElement('div');
    withExoCompiler(new ExoDomBackend()).render(Counter, plain);
    expect(plain.innerHTML).toBe('<div class="counter"><span>0</span><button>+1</button></div>');
});
