import { describe, expect, it } from 'vitest';
import { Link, MemoryRouter, Route, Routes, useNavigate, useParams } from 'react-router';
import { mountExoReactTree } from './helpers/mountExoReactTree';
import { clickExoReactElement } from './helpers/clickExoReactElement';
import { waitForExoReactCondition } from './helpers/waitForExoReactCondition';

function UserPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    return (
        <section>
            <h1>user {id}</h1>
            <button onClick={() => navigate('/')}>back</button>
        </section>
    );
}

function App() {
    return (
        <MemoryRouter initialEntries={['/']}>
            <nav>
                <Link to="/users/7">open user</Link>
            </nav>
            <Routes>
                <Route path="/" element={<h1>home</h1>} />
                <Route path="/users/:id" element={<UserPage />} />
            </Routes>
        </MemoryRouter>
    );
}

describe('react-router', () => {
    it('renders the matching route, navigates on a Link click and back through useNavigate', async () => {
        const { container, unmount } = await mountExoReactTree(<App />);
        expect(container.querySelector('h1')?.textContent).toBe('home');
        const link = container.querySelector('a');
        expect(link?.getAttribute('href')).toBe('/users/7');

        await clickExoReactElement(link);
        await waitForExoReactCondition(
            () => container.querySelector('h1')?.textContent === 'user 7'
        );
        expect(container.querySelectorAll('h1')).toHaveLength(1);

        await clickExoReactElement(container.querySelector('button'));
        await waitForExoReactCondition(
            () => container.querySelector('h1')?.textContent === 'home'
        );
        await unmount();
        expect(container.innerHTML).toBe('');
    });
});
