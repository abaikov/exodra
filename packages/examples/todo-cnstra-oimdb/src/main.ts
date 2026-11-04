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
import { OIMExodraPlugin } from '@oimdb/exodra';

const oimdb = createTodoOimdb();
const exodraPlugin = new OIMExodraPlugin({ db: oimdb });
const todoDb = oimdb.schemas.todos;
const cns = createTodoCns(oimdb, todoDb);

const backend = composeExoPlugins(withExoChildList(withExoCompiler(new ExoDomBackend())), {
    events: () => createExoDelegatedEvents(['change', 'click', 'dblclick', 'keydown', 'focusout']),
    todoDb: () => todoDb,
    cns: () => cns,
    exodraPlugin: () => exodraPlugin,
});

backend.render(todoAppMachine, document.getElementById('root') as HTMLElement);
