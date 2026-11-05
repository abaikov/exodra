import Link from '@docusaurus/Link';
import Reveal from './Reveal';
import HeroCodePre from './HeroCodePre';
import styles from './styles.module.css';

const RULES = [
    {
        name: 'React · Strict Mode',
        when: 'react.dev, Synchronizing with Effects',
        text: '“In Strict Mode, React mounts components twice (in development only!) to stress-test your Effects.” Development and production run your effects a different number of times.',
        code: 'useEffect(() => { conn.connect(); }, []);\n// dev: connects twice, prod: once',
        href: 'https://react.dev/learn/synchronizing-with-effects',
    },
    {
        name: 'React · useMemo',
        when: 'react.dev, useMemo',
        text: '“Since useMemo is performance optimization, not a semantic guarantee, React may throw away the cached value if there is a specific reason to do that.” An effect that depends on the value re-fires when it does.',
        code: 'const options = useMemo(() => ({ roomId }), [roomId]);\nuseEffect(connect, [options]); // may reconnect anyway',
        href: 'https://react.dev/reference/react/useMemo',
    },
    {
        name: 'React · state',
        when: 'react.dev, State as a Snapshot',
        text: '“Setting state only changes it for the next render.” Three increments in one handler add one.',
        code: 'setNumber(number + 1);\nsetNumber(number + 1);\nsetNumber(number + 1); // +1, not +3',
        href: 'https://react.dev/learn/state-as-a-snapshot',
    },
    {
        name: 'React · fetching',
        when: 'react.dev, Synchronizing with Effects',
        text: 'Two requests from one effect can finish in either order, and the older answer can overwrite the newer one. The documented answer is an ignore flag you remember to write in every fetching effect.',
        code: 'let ignore = false;\nfetchBio(person).then((r) => { if (!ignore) setBio(r); });\nreturn () => { ignore = true; };',
        href: 'https://react.dev/learn/synchronizing-with-effects',
    },
    {
        name: 'Vue · reactive()',
        when: 'vuejs.org, Reactivity Fundamentals',
        text: '“When we destructure a reactive object’s primitive type property into local variables, or when we pass that property into a function, we will lose the reactivity connection.”',
        code: 'const state = reactive({ count: 0 });\nlet { count } = state;\ncount++; // state.count is still 0',
        href: 'https://vuejs.org/guide/essentials/reactivity-fundamentals.html',
    },
    {
        name: 'Svelte 5 · $state.raw',
        when: 'svelte.dev, $state',
        text: '“State declared with $state.raw cannot be mutated; it can only be reassigned.” A mutation is accepted, and the screen does not change.',
        code: 'let person = $state.raw({ age: 49 });\nperson.age += 1; // no update',
        href: 'https://svelte.dev/docs/svelte/$state',
    },
    {
        name: 'Solid · components',
        when: 'docs.solidjs.com, Components',
        text: '“A Solid component is only run once, when it is first rendered into the DOM.” A branch written as an early return is decided once, for good.',
        code: 'if (!props.user) return <Login />;\nreturn <p>Hi {props.user.name}</p>;',
        href: 'https://docs.solidjs.com/concepts/components/basics',
    },
    {
        name: 'Angular · NG0100',
        when: 'angular.dev, NG0100',
        text: '“Angular only throws this error in development mode.” A binding that changed after its check is reported while you develop, and is quiet in production.',
        code: 'ngAfterViewInit() {\n    this.title = "loaded"; // NG0100 in dev only\n}',
        href: 'https://angular.dev/errors/NG0100',
    },
    {
        name: 'Next.js 15 · fetch',
        when: 'nextjs.org, Upgrading to version 15',
        text: '“fetch requests are no longer cached by default.” The same line was cached in 14 and is not in 15.',
        code: "await fetch('https://…'); // 14: cached, 15: not",
        href: 'https://nextjs.org/docs/app/guides/upgrading/version-15',
    },
];

const FOREIGN_CODE = `c.appendChild(
    ChartPorts.BODY,
    c.foreign({ createDom: (self) => exoForeignNode(self, chartCanvas) }),
);`;

const REACT_PATCH_CODE = `// the workaround from the React team, issue #11538
const removeChild = Node.prototype.removeChild;
Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
        console.error('Cannot remove a child from a different parent',
            child, this);
        return child;
    }
    return removeChild.apply(this, arguments);
};`;

const EXODRA_WRITER_CODE = `const translatedText: TExoDomSetter = (el, value) => {
    const font = el.firstElementChild;  // the translator's <font>
    (font ?? el).textContent = String(value ?? '');
};

const backend = composeExoPlugins(withExoCompiler(new ExoDomBackend()), {
    writers: (next: TExoWritersApi): TExoWritersApi => ({
        name: 'translated text over ' + next.name,
        attr: (name, proto, kind, at) => next.attr(name, proto, kind, at),
        markupCarries: (name, proto) => next.markupCarries(name, proto),
        text: () => translatedText,
    }),
});`;

export default function LandingHiddenRules() {
    return (
        <section className={styles.section}>
            <div className="container">
                <Reveal>
                    <p className={styles.eyebrow}>Rules nobody wrote in your code</p>
                    <h2 className={styles.statement}>
                        Every one of these is in the official docs.
                    </h2>
                    <p className={styles.lead}>
                        None of them is a bug report. Each is documented behaviour, and in each the
                        program you wrote reads as correct: it runs twice, or once too few, or stops
                        updating, and nothing is thrown.
                    </p>
                </Reveal>
                <div className={`${styles.anatomy} ${styles.anatomyFlat}`}>
                    {RULES.map((rule, at) => (
                        <Reveal
                            key={rule.name}
                            delayMs={(at % 3) * 120}
                            className={styles.anatomyCell}
                        >
                            <div className={styles.anatomyCard}>
                                <h3 className={styles.anatomyName}>{rule.name}</h3>
                                <a
                                    className={styles.anatomyWhen}
                                    href={rule.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {rule.when}
                                </a>
                                <p className={styles.anatomyText}>{rule.text}</p>
                                <code className={styles.anatomyCode}>{rule.code}</code>
                            </div>
                        </Reveal>
                    ))}
                </div>
                <Reveal className={styles.subsection}>
                    <p className={styles.eyebrow}>Somebody else's DOM</p>
                    <h2 className={styles.statement}>
                        A translator rewrites your page. Who fixes it?
                    </h2>
                    <p className={`${styles.lead} ${styles.leadTight}`}>
                        Google Translate and the browser’s own translator move text into a{' '}
                        <code>&lt;font&gt;</code> of their own. React can then crash with{' '}
                        <code>Failed to execute 'removeChild' on 'Node'</code>. The{' '}
                        <a
                            href="https://github.com/facebook/react/issues/11538#issuecomment-417504600"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            issue
                        </a>{' '}
                        was closed in 2018 with “I don’t think we can fix this in React without
                        making legitimate mistakes hard to find, or making performance worse for
                        common cases”, and no release since lists a fix. What a React app can do is
                        patch the browser’s <code>Node.prototype</code> for every library on the
                        page.
                    </p>
                    <p className={styles.lead}>
                        In Exodra, how text reaches the DOM is a plugin. The default bundle,{' '}
                        <code>withExoDefaults</code>, already re-checks the element on every write:
                        the page keeps updating, and the translator's <code>&lt;font&gt;</code> is
                        replaced by the new text. If your page needs a different policy, say keeping
                        the <code>&lt;font&gt;</code> and writing into it, you write a writer and
                        compose it: no fork, no patch to the platform, nothing from us.
                    </p>
                    <div className={styles.pairingGrid}>
                        <div className={styles.codeWindow}>
                            <div className={styles.codeWindowBar}>
                                <span />
                                <span />
                                <span />
                                <em>react: patch the platform</em>
                            </div>
                            <HeroCodePre>
                                <code className="language-js">{REACT_PATCH_CODE}</code>
                            </HeroCodePre>
                        </div>
                        <div className={styles.codeWindow}>
                            <div className={styles.codeWindowBar}>
                                <span />
                                <span />
                                <span />
                                <em>exodra: compose your own writer</em>
                            </div>
                            <HeroCodePre>
                                <code className="language-ts">{EXODRA_WRITER_CODE}</code>
                            </HeroCodePre>
                        </div>
                    </div>
                    <p className={styles.footnote}>
                        <Link to="/docs/guides/plugins">
                            Writers and the packs that ship, in the plugins guide →
                        </Link>
                    </p>
                </Reveal>
                <Reveal className={styles.subsection}>
                    <p className={styles.eyebrow}>Our rules</p>
                    <h2 className={styles.statement}>Exodra has rules too. They fail out loud.</h2>
                    <p className={`${styles.lead} ${styles.leadTight}`}>
                        A schema is one root element, and markup the HTML parser would rearrange — a{' '}
                        <code>&lt;div&gt;</code> inside a <code>&lt;p&gt;</code>, a{' '}
                        <code>&lt;tr&gt;</code> straight inside a <code>&lt;table&gt;</code> — is
                        refused, because the server's page and the browser's would come out as two
                        different trees. Each refusal is an error with a code, thrown when the
                        schema compiles, never a screen that quietly stops updating.
                    </p>
                    <p className={styles.lead}>
                        And none of them is part of the language. The compiler is a plugin, a
                        backend compiles the same declaration by its own rules, and a children port
                        holds an element that anything else built — a chart library's canvas, a
                        template engine's clone:
                    </p>
                    <div className={styles.codeWindow}>
                        <div className={styles.codeWindowBar}>
                            <span />
                            <span />
                            <span />
                            <em>an element Exodra did not make</em>
                        </div>
                        <HeroCodePre>
                            <code className="language-ts">{FOREIGN_CODE}</code>
                        </HeroCodePre>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
