import Link from '@docusaurus/Link';
import Reveal from './Reveal';
import HeroCodePre from './HeroCodePre';
import { AxisStory } from './LandingSpeed';
import { REACT_AXES, REACT_LIBRARIES } from './landingAxes';
import styles from './styles.module.css';

const REACT_APP_CODE = `import { useState } from 'react';
import { createRoot } from 'react-dom/client';

function Counter() {
    const [n, setN] = useState(0);
    return <button onClick={() => setN(n + 1)}>clicked {n}</button>;
}

createRoot(document.getElementById('root')!).render(<Counter />);`;

const APP_AXES = REACT_AXES.filter((axis) => axis.axis !== 'react-libraries');
const LIBRARY_AXES = REACT_AXES.filter((axis) => axis.axis === 'react-libraries');

export default function LandingReact() {
    return (
        <section className={styles.section}>
            <div className="container">
                <Reveal>
                    <p className={styles.eyebrow}>React</p>
                    <h2 className={styles.statement}>React code, rendered faster than React.*</h2>
                    <p className={styles.lead}>This is a React app. It runs on Exodra as written.</p>
                </Reveal>
                <Reveal>
                    <div className={styles.codeWindow}>
                        <div className={styles.codeWindowBar}>
                            <span />
                            <span />
                            <span />
                            <em>counter.tsx</em>
                        </div>
                        <HeroCodePre>
                            <code className="language-tsx">{REACT_APP_CODE}</code>
                        </HeroCodePre>
                    </div>
                </Reveal>
                <Reveal>
                    <p className={styles.lead}>
                        Alias <code>react</code> and <code>react-dom</code> to <code>@exodra/react-compat</code> and the
                        app runs on Exodra machines, with no virtual DOM in between. Add{' '}
                        <code>@exodra/babel-plugin-schema/react</code> to the build and it mounts and updates faster than
                        React itself.
                    </p>
                </Reveal>
                <div className={styles.stories}>
                    {APP_AXES.map((axis, at) => (
                        <AxisStory key={axis.axis} axis={axis} isFlipped={at % 2 === 1} />
                    ))}
                </div>
                <Reveal>
                    <p className={styles.footnote}>
                        * Through the compiler. It takes your JSX and code that is already compiled to{' '}
                        <code>jsx()</code> or <code>createElement</code> calls, so React libraries from npm go through
                        it as they are. Without it, updates are still ahead of React; mounting is level.
                    </p>
                </Reveal>
                <Reveal>
                    <h3 className={styles.reactTax}>No ecosystem tax.</h3>
                    <p className={styles.lead}>
                        The React libraries you already use run on it unchanged. Each one below is tested on Exodra and
                        on React with the same assertions, with every release.
                    </p>
                    <ul className={styles.reactLibraries}>
                        {REACT_LIBRARIES.map((name) => (
                            <li key={name} className={styles.reactLibrary}>
                                {name}
                            </li>
                        ))}
                    </ul>
                </Reveal>
                <div className={styles.stories}>
                    {LIBRARY_AXES.map((axis, at) => (
                        <AxisStory key={axis.axis} axis={axis} isFlipped={at % 2 === 1} />
                    ))}
                </div>
                <Reveal>
                    <p className={styles.footnote}>
                        <Link to="/docs/guides/react-compat">React code on Exodra: aliasing, the compiler, every known difference →</Link>
                    </p>
                </Reveal>
            </div>
        </section>
    );
}
