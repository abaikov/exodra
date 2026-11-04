import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import { MDXProvider } from '@mdx-js/react';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import LandingSpeed from '@site/src/components/Landing/LandingSpeed';
import LandingReact from '@site/src/components/Landing/LandingReact';
import LandingPlugins from '@site/src/components/Landing/LandingPlugins';
import HeroCodePre from '@site/src/components/Landing/HeroCodePre';
import LandingAnatomy from '@site/src/components/Landing/LandingAnatomy';
import LandingNoMagic from '@site/src/components/Landing/LandingNoMagic';
import LandingHiddenRules from '@site/src/components/Landing/LandingHiddenRules';
import Reveal from '@site/src/components/Landing/Reveal';
import landingStyles from '@site/src/components/Landing/styles.module.css';
import HeroCodeJsx from './_heroCode.mdx';
import HeroCodeTs from './_heroCodeTs.mdx';
import styles from './index.module.css';

const HERO_CODE_COMPONENTS = { pre: HeroCodePre };

const HERO_WINDOWS = [
    { name: 'counter.ts', caption: null, Code: HeroCodeTs },
    { name: 'counter.tsx', caption: 'The same machine, with its schema declared in JSX and compiled at build time, so the page ships no compiler:', Code: HeroCodeJsx },
];

function HeroWindow() {
    return (
        <Reveal className={styles.windowWrap}>
            {HERO_WINDOWS.map(({ name, caption, Code }) => (
                <div key={name}>
                    {caption === null ? null : <p className={styles.windowCaption}>{caption}</p>}
                    <div className={styles.window}>
                        <div className={styles.windowBar}>
                            <span /><span /><span />
                            <em>{name}</em>
                        </div>
                        <MDXProvider components={HERO_CODE_COMPONENTS}>
                            <Code />
                        </MDXProvider>
                    </div>
                </div>
            ))}
        </Reveal>
    );
}

function HomepageHeader() {
    return (
        <header className={styles.hero}>
            <div
                className={styles.backdrop}
                style={{ backgroundImage: `url(${useBaseUrl('/img/exodra.png')})` }}
                aria-hidden="true"
            />
            <div className={styles.glow} aria-hidden="true" />
            <div className={`container ${styles.heroInner}`}>
                <div className={styles.brand}>
                    <img className={styles.brandLogo} src={useBaseUrl('/img/favicon.svg')} alt="" aria-hidden="true" />
                    <span className={styles.brandName}>EXODRA</span>
                </div>
                <p className={styles.kicker}>Imperative UI framework · no build step required</p>
                <h1 className={styles.title}>
                    Plain TypeScript.
                    <br />
                    <span className={styles.accent}>Near hand-written speed.</span>
                </h1>
                <p className={styles.subtitle}>
                    Components with state, effects and context at the cost of a template engine: mounts faster than
                    Mikado, Solid and React, updates level with hand-rolled DOM code. Reactivity, keys, hydration and
                    React’s API sit on top as plugins: take the ones a screen needs, leave the rest out of the bundle.
                </p>
                <div className={styles.buttons}>
                    <Link className="button button--primary button--lg" to="/docs/getting-started">
                        Get started
                    </Link>
                    <Link className={styles.ghost} to="/docs/benchmarks">
                        See the benchmarks →
                    </Link>
                </div>
                <HeroWindow />
            </div>
        </header>
    );
}

function ClosingSection() {
    return (
        <section className={landingStyles.closing}>
            <div className="container">
                <Reveal>
                    <h2 className={landingStyles.closingTitle}>Start imperative. Add what you need.</h2>
                    <p className={landingStyles.closingText}>
                        Install @exodra/core and @exodra/dom, declare a schema in plain TypeScript, and render it. Reach
                        for reactivity, JSX or React’s API when a screen asks for it.
                    </p>
                    <div className={landingStyles.pairing}>
                        <p className={landingStyles.pairingLabel}>Recommended together with</p>
                        <div className={landingStyles.pairingGrid}>
                            <div>
                                <a className={`${landingStyles.pairingName} ${landingStyles.pairingNamePixel}`} href="https://cnstra.org/" target="_blank" rel="noopener noreferrer">
                                    CNStra
                                </a>
                                <p className={landingStyles.pairingText}>
                                    Decides what happens and in what order.
                                </p>
                            </div>
                            <div>
                                <a className={`${landingStyles.pairingName} ${landingStyles.pairingNamePixel}`} href="https://oimdb.org/" target="_blank" rel="noopener noreferrer">
                                    OIMDB
                                </a>
                                <p className={landingStyles.pairingText}>
                                    Holds the data, and hands back the same entity object until it changes, so a list row
                                    keeps its identity without a key.
                                </p>
                            </div>
                        </div>
                        <p className={landingStyles.pairingText}>
                            Exodra puts it on the screen. One line flushes OIMDB at the end of every CNStra turn:
                        </p>
                        <code className={landingStyles.pairingCode}>cns.addDrainListener(() =&gt; db.flush());</code>
                        <Link className={landingStyles.pairingLink} to="/docs/guides/lists">
                            Lists and identity →
                        </Link>
                    </div>
                    <div className={styles.buttons} style={{ justifyContent: 'center' }}>
                        <Link className="button button--primary button--lg" to="/docs/getting-started">
                            Get started
                        </Link>
                        <Link className={styles.ghost} to="/docs/core/concepts">
                            How it works →
                        </Link>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

export default function Home() {
    return (
        <Layout
            title="Plain TypeScript. Near hand-written speed."
            description="Exodra is an imperative UI framework for plain TypeScript: no build step required, mounting within 30% of hand-written DOM code, with reactivity, keys, hydration and React's API as plugins on top."
        >
            <HomepageHeader />
            <main>
                <HomepageFeatures />
                <LandingAnatomy />
                <LandingNoMagic />
                <LandingHiddenRules />
                <LandingSpeed />
                <LandingReact />
                <LandingPlugins />
                <ClosingSection />
            </main>
        </Layout>
    );
}
