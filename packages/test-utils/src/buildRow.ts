import type { TExoSchemaCursor, TExoAttrPort, TExoTextPort, TExoEventPort } from '@exodra/core';
import type { TExoTestRowPorts } from './types/TExoTestRowPorts';

// The shape the published benchmark numbers were measured on, SHARED so the DOM and the string
// backend are compared on the same bytes rather than on two drifting copies. See README.
export function buildRow(b: TExoSchemaCursor): TExoTestRowPorts {
    let id!: TExoAttrPort;
    let label!: TExoTextPort;
    let mark!: TExoAttrPort;
    let click!: TExoEventPort;
    let count!: TExoTextPort;
    b.el('li', { class: 'row' }, (li) => {
        id = li.port('data-id');
        li.el('span', { class: 'row__label' }, (span) => {
            label = span.textPort();
        });
        li.el('button', { class: 'row__btn' }, (btn) => {
            mark = btn.port('data-b');
            click = btn.eventPort('click');
            count = btn.textPort();
        });
    });
    return { id, label, mark, click, count };
}
