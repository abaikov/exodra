import { useState } from 'react';
import { TodoItem } from './TodoItem';
import {
    completedCleared,
    filterChanged,
    selectCounts,
    selectFilter,
    selectVisibleTodos,
    todoAdded,
    useAppDispatch,
    useAppSelector,
} from './store';
import type { Filter } from './store';

const FILTERS: { filter: Filter; label: string }[] = [
    { filter: 'all', label: 'All' },
    { filter: 'active', label: 'Active' },
    { filter: 'completed', label: 'Completed' },
];

export function App() {
    const dispatch = useAppDispatch();
    const todos = useAppSelector(selectVisibleTodos);
    const current = useAppSelector(selectFilter);
    const { active, done } = useAppSelector(selectCounts);
    const [draft, setDraft] = useState('');
    const empty = active + done === 0;

    return (
        <section className="todoapp">
            <header className="header">
                <h1>todos</h1>
                <input
                    className="new-todo"
                    placeholder="What needs to be done?"
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        const title = draft.trim();
                        if (title === '') return;
                        dispatch(todoAdded(title));
                        setDraft('');
                    }}
                />
            </header>
            <section className="main" hidden={empty}>
                <ul className="todo-list">
                    {todos.map((todo) => (
                        <TodoItem key={todo.id} todo={todo} />
                    ))}
                </ul>
            </section>
            <footer className="footer" hidden={empty}>
                <span className="todo-count">
                    <strong>{active}</strong>
                    <span>{active === 1 ? ' item left' : ' items left'}</span>
                </span>
                <ul className="filters">
                    {FILTERS.map(({ filter, label }) => (
                        <li key={filter}>
                            <a
                                href={`#/${filter}`}
                                className={filter === current ? 'selected' : undefined}
                                onClick={(e) => {
                                    e.preventDefault();
                                    dispatch(filterChanged(filter));
                                }}
                            >
                                {label}
                            </a>
                        </li>
                    ))}
                </ul>
                <button
                    className="clear-completed"
                    type="button"
                    hidden={done === 0}
                    onClick={() => dispatch(completedCleared())}
                >
                    Clear completed
                </button>
            </footer>
        </section>
    );
}
