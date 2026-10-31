import Link from '@docusaurus/Link';
import Reveal from './Reveal';
import styles from './styles.module.css';

const STAGES = [
    {
        when: 'once, when the module loads',
        name: 'Schema',
        text: 'Markup and its ports, declared with a function call. Every port gets its number here and keeps it.',
        code: "b.el('span', null, (s) => s.textPort())",
    },
    {
        when: 'once per instance',
        name: 'Machine',
        text: 'Initial state and transitions. A transition fills ports by number: nothing is diffed, nothing is walked.',
        code: "c.text(P.count, '1')",
    },
    {
        when: 'wherever it runs',
        name: 'Backend',
        text: 'The same machine renders into the DOM, prints HTML on the server, adopts it on the client, or drives a terminal.',
        code: 'backend.render(COUNTER, root)',
    },
];

export default function LandingAnatomy() {
    return (
        <section className={styles.section}>
            <div className="container">
                <Reveal>
                    <p className={styles.eyebrow}>How it works</p>
                    <h2 className={styles.statement}>Built once. Filled per instance. Rendered anywhere.</h2>
                </Reveal>
                <div className={styles.anatomy}>
                    {STAGES.map((stage, at) => (
                        <Reveal key={stage.name} delayMs={at * 120} className={styles.anatomyCell}>
                            <div className={styles.anatomyCard}>
                                <span className={styles.anatomyStep}>{String(at + 1).padStart(2, '0')}</span>
                                <h3 className={styles.anatomyName}>{stage.name}</h3>
                                <span className={styles.anatomyWhen}>{stage.when}</span>
                                <p className={styles.anatomyText}>{stage.text}</p>
                                <code className={styles.anatomyCode}>{stage.code}</code>
                            </div>
                        </Reveal>
                    ))}
                </div>
                <Reveal>
                    <p className={styles.footnote}>
                        <Link to="/docs/guides/components">The components guide →</Link>
                    </p>
                </Reveal>
            </div>
        </section>
    );
}
