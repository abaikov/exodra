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

const REACT_READ_CODE = `function Todo({ id }) {
    const todo = useSyncExternalStore(
        (notify) => store.hold(id, notify), // runs later, in an effect
        () => store.get(id),                // runs now, in render
    );
    return <li>{todo.title}</li>;
}`;

const EXODRA_READ_CODE = `withOIMEffects(m, (effect) => {
    effect((c) => {
        const todo = c.state.slot.entity;   // read, then held,
        if (todo !== undefined)             // in this same call
            c.text(TodoRowPorts.TITLE, todo.title);
    });
});`;

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
                <Reveal className={styles.afterCards}>
                    <p className={styles.lead}>
                        Exodra has nothing to decide. A schema is a function call, a transition writes a port by number
                        when you call it, and the price of a list is the call you chose: a fixed list, a list by
                        identity, or a keyed one. Nothing is inferred from your code: the JSX plugin compiles a declaration
                        into its schema at build time and refuses, there and then, anything that is not markup, a
                        module-level value or a port.
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
                <Reveal className={styles.subsection}>
                    <p className={styles.eyebrow}>Read, then hold</p>
                    <h2 className={styles.statement}>React reads before it subscribes.</h2>
                    <p className={styles.lead}>
                        A component reads the store while it renders. <code>useSyncExternalStore</code> subscribes later,
                        in an effect, and after a first render, a transition, or an update from the network or a timer,
                        that effect runs in a later task. Anything that commits in between sees data nobody holds yet: a
                        store that collects unheld data drops it, and a request tied to it is cancelled and sent again
                        when the subscription finally arrives. Tests rarely show it, because <code>act()</code> flushes
                        those effects at once. Moving the work into render is not allowed either: React's rule is that{' '}
                        <a href="https://react.dev/reference/rules/components-and-hooks-must-be-pure" target="_blank" rel="noopener noreferrer">
                            components and hooks must be pure
                        </a>
                        , so every data library designs around the gap.
                    </p>
                    <div className={styles.pairingGrid}>
                        <div className={styles.codeWindow}>
                            <div className={styles.codeWindowBar}>
                                <span />
                                <span />
                                <span />
                                <em>react: read, then subscribe later</em>
                            </div>
                            <HeroCodePre>
                                <code className="language-tsx">{REACT_READ_CODE}</code>
                            </HeroCodePre>
                        </div>
                        <div className={styles.codeWindow}>
                            <div className={styles.codeWindowBar}>
                                <span />
                                <span />
                                <span />
                                <em>exodra: read and hold in one call</em>
                            </div>
                            <HeroCodePre>
                                <code className="language-ts">{EXODRA_READ_CODE}</code>
                            </HeroCodePre>
                        </div>
                    </div>
                    <p className={styles.lead}>
                        An Exodra effect has no render phase in front of it. It starts while the node is being built,
                        in the same call stack, and the oimdb effect reads the data and holds what it read before it
                        returns.
                    </p>
                </Reveal>
            </div>
        </section>
    );
}
