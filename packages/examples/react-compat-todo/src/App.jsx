import {
    createContext,
    memo,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
} from 'react';

const FILTERS = ['all', 'active', 'completed'];
const LABELS = { all: 'All', active: 'Active', completed: 'Completed' };
const Actions = createContext(null);

let nextId = 1;

function reduceTodos(todos, action) {
    switch (action.type) {
        case 'add':
            return [...todos, { id: nextId++, title: action.title, done: false }];
        case 'toggle':
            return todos.map((todo) =>
                todo.id === action.id ? { ...todo, done: !todo.done } : todo
            );
        case 'toggleAll':
            return todos.map((todo) =>
                todo.done === action.done ? todo : { ...todo, done: action.done }
            );
        case 'edit':
            return action.title === ''
                ? todos.filter((todo) => todo.id !== action.id)
                : todos.map((todo) =>
                      todo.id === action.id ? { ...todo, title: action.title } : todo
                  );
        case 'remove':
            return todos.filter((todo) => todo.id !== action.id);
        case 'clearCompleted':
            return todos.filter((todo) => !todo.done);
        default:
            return todos;
    }
}

const TodoItem = memo(function TodoItem({ todo, editing, onEdit }) {
    const dispatch = useContext(Actions);
    const [draft, setDraft] = useState(todo.title);
    const input = useRef(null);
    useEffect(() => {
        if (editing) input.current.focus();
    }, [editing]);
    const finish = () => {
        dispatch({ type: 'edit', id: todo.id, title: draft.trim() });
        onEdit(null);
    };
    return (
        <li className={[todo.done ? 'completed' : '', editing ? 'editing' : ''].join(' ').trim()}>
            <div className="view">
                <input
                    className="toggle"
                    type="checkbox"
                    checked={todo.done}
                    onChange={() => dispatch({ type: 'toggle', id: todo.id })}
                />
                <label onDoubleClick={() => onEdit(todo.id)}>{todo.title}</label>
                <button
                    className="destroy"
                    onClick={() => dispatch({ type: 'remove', id: todo.id })}
                />
            </div>
            {editing && (
                <input
                    ref={input}
                    className="edit"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={finish}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') finish();
                        if (event.key === 'Escape') {
                            setDraft(todo.title);
                            onEdit(null);
                        }
                    }}
                />
            )}
        </li>
    );
});

function Footer({ left, done, filter, onFilter }) {
    const dispatch = useContext(Actions);
    return (
        <footer className="footer">
            <span className="todo-count">
                <strong>{left}</strong> {left === 1 ? 'item' : 'items'} left
            </span>
            <ul className="filters">
                {FILTERS.map((name) => (
                    <li key={name}>
                        <a
                            href={'#/' + name}
                            className={name === filter ? 'selected' : ''}
                            onClick={() => onFilter(name)}
                        >
                            {LABELS[name]}
                        </a>
                    </li>
                ))}
            </ul>
            {done > 0 && (
                <button
                    className="clear-completed"
                    onClick={() => dispatch({ type: 'clearCompleted' })}
                >
                    Clear completed
                </button>
            )}
        </footer>
    );
}

export function App() {
    const [todos, dispatch] = useReducer(reduceTodos, []);
    const [title, setTitle] = useState('');
    const [filter, setFilter] = useState('all');
    const [editing, setEditing] = useState(null);
    const left = useMemo(() => todos.filter((todo) => !todo.done).length, [todos]);
    const shown = useMemo(
        () =>
            todos.filter((todo) =>
                filter === 'all' ? true : filter === 'active' ? !todo.done : todo.done
            ),
        [todos, filter]
    );
    const onEdit = useCallback((id) => setEditing(id), []);
    return (
        <Actions.Provider value={dispatch}>
            <section className="todoapp">
                <header className="header">
                    <h1>todos</h1>
                    <input
                        className="new-todo"
                        placeholder="What needs to be done?"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter' || title.trim() === '') return;
                            dispatch({ type: 'add', title: title.trim() });
                            setTitle('');
                        }}
                    />
                </header>
                {todos.length > 0 && (
                    <section className="main">
                        <input
                            id="toggle-all"
                            className="toggle-all"
                            type="checkbox"
                            checked={left === 0}
                            onChange={() => dispatch({ type: 'toggleAll', done: left !== 0 })}
                        />
                        <ul className="todo-list">
                            {shown.map((todo) => (
                                <TodoItem
                                    key={todo.id}
                                    todo={todo}
                                    editing={editing === todo.id}
                                    onEdit={onEdit}
                                />
                            ))}
                        </ul>
                    </section>
                )}
                {todos.length > 0 && (
                    <Footer
                        left={left}
                        done={todos.length - left}
                        filter={filter}
                        onFilter={setFilter}
                    />
                )}
            </section>
        </Actions.Provider>
    );
}
