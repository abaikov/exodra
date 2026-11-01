import { composeExoPlugins } from '@exodra/core';
import {
    ExoDomBackend,
    createExoDelegatedEvents,
    withExoChildList,
    withExoCompiler,
} from '@exodra/dom';
import { TodoApp } from './TodoApp';
import { TodoDb } from './TodoDb';
import { createTodoCns } from './createTodoCns';

const backend = composeExoPlugins(withExoChildList(withExoCompiler(new ExoDomBackend())), {
    events: () => createExoDelegatedEvents(['change', 'click', 'dblclick', 'keydown', 'focusout']),
});

backend.render(TodoApp, document.getElementById('root') as HTMLElement, {
    cns: createTodoCns(TodoDb),
});
