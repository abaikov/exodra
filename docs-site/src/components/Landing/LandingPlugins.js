import Link from '@docusaurus/Link';
import Reveal from './Reveal';
import HeroCodePre from './HeroCodePre';
import styles from './styles.module.css';

const PLUGIN_CODE = `import { composeExoPlugins } from '@exodra/core';

const stamp = (next) =>
    function (port, handler, subject) {
        next.call(this, port, handler, subject);
        const name = this.schema.portNames[port.index];
        if (name !== null) this.portNode(port).setAttribute('data-testid', name);
    };

export function withExoTestIds(backend) {
    composeExoPlugins(backend, { on: stamp });
    if (backend.hydrateSurface) composeExoPlugins(backend.hydrateSurface, { on: stamp });
    return backend;
}`;

const USE_CODE = `const backend = withExoCompiler(new ExoDomBackend());

export const app = import.meta.env.MODE === 'test' ? withExoTestIds(backend) : backend;

app.render(counterMachine, root);
// <button data-testid="INCREMENT">+1</button>`;

export default function LandingPlugins() {
    return (
        <section className={styles.section}>
            <div className="container">
                <Reveal>
                    <p className={styles.eyebrow}>Plugins</p>
                    <h2 className={styles.statement}>Composed, not configured.</h2>
                    <p className={styles.lead}>
                        A plugin is a set of functions that each receive what a backend method does
                        now and return what it does next. This one wraps <code>on</code>, the method
                        that attaches every handler, and stamps a <code>data-testid</code> on the
                        element it attaches to, named after the port: every compiled schema carries
                        its port names, so the plugin is handed nothing.
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
                        Compose it in the test build and leave it out of production. There is no
                        flag to check at runtime: in production the method was never wrapped, so it
                        never runs.
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
                        <Link to="/docs/guides/plugins">
                            Plugins and the interfaces they implement →
                        </Link>
                    </p>
                </Reveal>
            </div>
        </section>
    );
}
