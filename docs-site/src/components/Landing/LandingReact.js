import Link from '@docusaurus/Link';
import Reveal from './Reveal';
import { AxisStory } from './LandingSpeed';
import { REACT_AXES, REACT_LIBRARIES } from './landingAxes';
import styles from './styles.module.css';

export default function LandingReact() {
    return (
        <section className={styles.section}>
            <div className="container">
                <Reveal>
                    <p className={styles.eyebrow}>React</p>
                    <h2 className={styles.statement}>React code, rendered faster than React.*</h2>
                    <p className={styles.lead}>
                        Alias <code>react</code> and <code>react-dom</code> to <code>@exodra/react-compat</code> and an
                        existing React application runs on Exodra machines, with no virtual DOM in between. Add
                        <code>@exodra/babel-plugin-schema/react</code> to the build and it mounts and updates faster than
                        React itself, with zustand and react-query doing the updates too.
                    </p>
                    <p className={styles.lead}>
                        * Through the compiler. It takes your JSX and code that is already compiled to{' '}
                        <code>jsx()</code> or <code>createElement</code> calls, so React libraries from npm go through
                        it as they are. Without it, mounting is level with React.
                    </p>
                </Reveal>
                <Reveal>
                    <p className={styles.reactLibrariesLabel}>React libraries tested on it with every release</p>
                    <ul className={styles.reactLibraries}>
                        {REACT_LIBRARIES.map((name) => (
                            <li key={name} className={styles.reactLibrary}>
                                {name}
                            </li>
                        ))}
                    </ul>
                </Reveal>
                <div className={styles.stories}>
                    {REACT_AXES.map((axis, at) => (
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
