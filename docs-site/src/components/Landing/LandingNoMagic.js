import Link from '@docusaurus/Link';
import Reveal from './Reveal';
import HeroCodePre from './HeroCodePre';
import styles from './styles.module.css';

const RULES = [
    {
        name: 'React Compiler',
        when: 'react.dev, React Compiler v1.0',
        text: 'Memoizes your code “based on its analysis and heuristics”. A future version may change how, and that can make a useEffect fire more or less often; the docs suggest pinning the exact compiler version.',
        code: 'npm install --save-exact babel-plugin-react-compiler',
        href: 'https://react.dev/blog/2025/10/07/react-compiler-1',
    },
    {
        name: 'Svelte 5',
        when: 'svelte.dev, $effect',
        text: '$effect tracks the values it reads synchronously. A value read after an await or inside a setTimeout is not tracked, and the effect never reruns for it.',
        code: 'await load();\nconsole.log(count); // not tracked',
        href: 'https://svelte.dev/docs/svelte/$effect',
    },
    {
        name: 'Solid',
        when: 'docs.solidjs.com, props',
        text: 'Destructuring props “can break reactivity”: the destructured value is read once and does not update when the prop changes.',
        code: 'const { name } = props; // never updates',
        href: 'https://docs.solidjs.com/concepts/components/props',
    },
];

const EXODRA_CODE = `open: (c) => {
    c.state.opened++;
    c.text(CardPorts.TITLE, String(c.state.opened));
},`;

export default function LandingNoMagic() {
    return (
        <section className={styles.section}>
            <div className="container">
                <Reveal>
                    <p className={styles.eyebrow}>No compiler magic</p>
                    <h2 className={styles.statement}>What updates is the line you wrote.</h2>
                    <p className={styles.lead}>
                        Compiled frameworks decide at build time what to track and what to memoize, by rules you have to
                        know and cannot see in your code. Break one and nothing fails: the screen just stops updating, or
                        updates too often.
                    </p>
                </Reveal>
                <div className={styles.anatomy}>
                    {RULES.map((rule, at) => (
                        <Reveal key={rule.name} delayMs={at * 120} className={styles.anatomyCell}>
                            <div className={styles.anatomyCard}>
                                <h3 className={styles.anatomyName}>{rule.name}</h3>
                                <a className={styles.anatomyWhen} href={rule.href} target="_blank" rel="noopener noreferrer">
                                    {rule.when}
                                </a>
                                <p className={styles.anatomyText}>{rule.text}</p>
                                <code className={styles.anatomyCode}>{rule.code}</code>
                            </div>
                        </Reveal>
                    ))}
                </div>
                <Reveal>
                    <p className={styles.lead}>
                        Exodra has nothing to decide. A schema is a function call, a transition writes a port by number
                        when you call it, and the price of a list is the call you chose: a fixed list, a list by
                        identity, or a keyed one. The TypeScript path has no compiler at all; the JSX plugin translates a
                        declaration and refuses, at build time, anything it cannot translate.
                    </p>
                    <div className={styles.codeWindow}>
                        <div className={styles.codeWindowBar}>
                            <span />
                            <span />
                            <span />
                            <em>a transition</em>
                        </div>
                        <HeroCodePre>
                            <code className="language-ts">{EXODRA_CODE}</code>
                        </HeroCodePre>
                    </div>
                    <p className={styles.footnote}>
                        <Link to="/docs/guides/components">Transitions and ports, in the components guide →</Link>
                    </p>
                </Reveal>
            </div>
        </section>
    );
}
