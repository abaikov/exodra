import Link from '@docusaurus/Link';
import clsx from 'clsx';
import Reveal from '@site/src/components/Landing/Reveal';
import styles from './styles.module.css';

const FEATURES = [
    {
        title: 'Plain TypeScript, no build step',
        to: '/docs/tooling/cdn',
        description: 'A schema is a function call that runs once, when the module loads. Load the files from a <script type="module"> and write ordinary TypeScript, or add the Babel or SWC plugin when you want JSX.',
        isWide: true,
    },
    {
        title: 'Imperative where it counts',
        to: '/docs/guides/components',
        description: 'A transition writes a port by number: text, attribute, event, children. No diff and no scheduler stand between your code and the DOM.',
    },
    {
        title: 'Every behaviour is a decorator',
        to: '/docs/guides/plugins',
        description: 'The backend is assembled from packs. Replace a named interface, such as event delegation, property writers or keyed lists, and everything you did not name stays what ships.',
    },
    {
        title: 'Any reactivity on top',
        to: '/docs/guides/lists',
        description: 'Effects that follow your data layer, lists reconciled by identity, keyed lists, or React’s component model. Each is a layer over the same imperative core, and you only pay for the ones you use.',
    },
    {
        title: 'React’s API, React’s libraries',
        to: '/docs/guides/react-compat',
        description: 'Alias react and react-dom, and an existing React app runs on Exodra machines, with hooks, context, Suspense and portals. There is no virtual DOM underneath.',
    },
    {
        title: 'A strategy for the hot path',
        to: '/docs/guides/optimizations',
        description: 'Keep a subtree alive instead of rebuilding it, or build a child with c.build and place it yourself when you already know where it goes. Each is a choice you make where it matters, not a flag every update checks.',
    },
    {
        title: 'Server, client, hydration',
        to: '/docs/guides/ssr',
        description: 'One schema prints HTML on the server and adopts it on the client, without rebuilding the page. The same machine drives a terminal backend too.',
    },
    {
        title: 'Numbers with their source',
        to: '/docs/why/what-the-floor-says',
        description: 'Every axis compares Exodra to hand-written code with no framework in it, and every published figure names the recording it came from.',
    },
];

export default function HomepageFeatures() {
    return (
        <section className={styles.features}>
            <div className="container">
                <Reveal>
                    <p className={styles.eyebrow}>What’s inside</p>
                    <h2 className={styles.statement}>An imperative engine, with the abstractions on top.</h2>
                </Reveal>
                <div className={styles.grid}>
                    {FEATURES.map((feature, at) => (
                        <Reveal
                            key={feature.title}
                            delayMs={(at % 3) * 80}
                            className={clsx(styles.cell, feature.isWide === true && styles.cellWide)}
                        >
                            <Link to={feature.to} className={styles.card}>
                                <h3 className={styles.title}>{feature.title}</h3>
                                <p className={styles.text}>{feature.description}</p>
                                <span className={styles.more}>Learn more →</span>
                            </Link>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
