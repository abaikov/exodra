import Link from '@docusaurus/Link';
import Reveal from './Reveal';
import HeroCodePre from './HeroCodePre';
import styles from './styles.module.css';

const PLUGIN_CODE = `import { composeExoPlugins } from '@exodra/core';

export function withExoTestIds(backend, ...portRecords) {
    const testIds = new Map();
    for (const ports of portRecords) for (const key in ports) testIds.set(ports[key], key);
    return composeExoPlugins(backend, {
        on: (next) =>
            function (port, handler, subject) {
                next.call(this, port, handler, subject);
                const testId = testIds.get(port);
                if (testId !== undefined) {
                    this.portNodeReader()(this.portTable(), port).setAttribute('data-testid', testId);
                }
            },
    });
}`;

const USE_CODE = `const backend = withExoCompiler(new ExoDomBackend());

export const app = import.meta.env.MODE === 'test'
    ? withExoTestIds(backend, CounterPorts)
    : backend;

app.render(Counter, root);
// <button data-testid="increment">+1</button>`;

export default function LandingPlugins() {
    return (
        <section className={styles.section}>
            <div className="container">
                <Reveal>
                    <p className={styles.eyebrow}>Plugins</p>
                    <h2 className={styles.statement}>Composed, not configured.</h2>
                    <p className={styles.lead}>
                        A plugin is a set of functions that each receive what a backend method does now and return what it
                        does next. This one wraps <code>on</code>, the method that attaches every handler, and stamps a{' '}
                        <code>data-testid</code> on the element it attaches to, named after the port.
                    </p>
                </Reveal>
                <Reveal>
                    <div className={styles.codeWindow}>
                        <div className={styles.codeWindowBar}>
                            <span />
                            <span />
                            <span />
                            <em>withExoTestIds.js</em>
                        </div>
                        <HeroCodePre>
                            <code className="language-js">{PLUGIN_CODE}</code>
                        </HeroCodePre>
                    </div>
                </Reveal>
                <Reveal>
                    <p className={styles.lead}>
                        Compose it in the test build and leave it out of production. There is no flag to check at
                        runtime: in production the method was never wrapped, so it never runs.
                    </p>
                    <div className={styles.codeWindow}>
                        <div className={styles.codeWindowBar}>
                            <span />
                            <span />
                            <span />
                            <em>app.js</em>
                        </div>
                        <HeroCodePre>
                            <code className="language-js">{USE_CODE}</code>
                        </HeroCodePre>
                    </div>
                </Reveal>
                <Reveal>
                    <p className={styles.footnote}>
                        <Link to="/docs/guides/plugins">Plugins and the interfaces they implement →</Link>
                    </p>
                </Reveal>
            </div>
        </section>
    );
}
