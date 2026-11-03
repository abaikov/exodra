import { composeExoPlugins } from '@exodra/core';
import {
    ExoDomBackend,
    createExoDelegatedEvents,
    withExoChildList,
    withExoCompiler,
} from '@exodra/dom';
import { todoAppMachine } from './todoAppMachine';
import { createTodoCns } from './createTodoCns';
import { createTodoOimdb } from './createTodoOimdb';
import { exoOimRowReleaseListener } from './exoOimRowReleaseListener';

const oimdb = createTodoOimdb();
const todoRowCell = oimdb.claimSlotDataCell();
oimdb.addSlotReleaseListener(exoOimRowReleaseListener(todoRowCell));
const todoDb = oimdb.schemas.todos;
const cns = createTodoCns(oimdb, todoDb);

const backend = composeExoPlugins(withExoChildList(withExoCompiler(new ExoDomBackend())), {
    events: () => createExoDelegatedEvents(['change', 'click', 'dblclick', 'keydown', 'focusout']),
    oimdb: () => oimdb,
    todoDb: () => todoDb,
    cns: () => cns,
    todoRowCell: () => todoRowCell,
});

backend.render(todoAppMachine, document.getElementById('root') as HTMLElement);
