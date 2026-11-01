import { memo, useEffect, useRef, useState } from 'react';
import { todoEdited, todoRemoved, todoToggled, useAppDispatch } from './store';
import type { Todo } from './store';

export const TodoItem = memo(function TodoItem({ todo }: { todo: Todo }) {
    const dispatch = useAppDispatch();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const field = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) field.current?.focus();
    }, [editing]);

    const startEditing = () => {
        setDraft(todo.title);
        setEditing(true);
    };
    const commit = () => {
        if (!editing) return;
        setEditing(false);
        dispatch(todoEdited({ id: todo.id, title: draft }));
    };

    const className = [todo.done && 'completed', editing && 'editing'].filter(Boolean).join(' ');
    return (
        <li className={className || undefined}>
            <div className="view">
                <input
                    className="toggle"
                    type="checkbox"
                    checked={todo.done}
                    onChange={(e) => dispatch(todoToggled({ id: todo.id, done: e.target.checked }))}
                />
                <label onDoubleClick={startEditing}>{todo.title}</label>
                <button
                    className="destroy"
                    type="button"
                    onClick={() => dispatch(todoRemoved(todo.id))}
                />
            </div>
            <input
                ref={field}
                className="edit"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') commit();
                    else if (e.key === 'Escape') setEditing(false);
                }}
                onBlur={commit}
            />
        </li>
    );
});
