import Link from '@docusaurus/Link';
import clsx from 'clsx';
import Reveal, { useRevealed } from './Reveal';
import { GROW_SHRINK_FLOOR, LANDING_AXES, MOUNT_HEADROOM_PERCENT } from './landingAxes';
import styles from './styles.module.css';

const PAR_TOLERANCE = 0.05;

const formatValue = (value) => (value < 1 ? value.toFixed(3) : value.toFixed(value < 10 ? 2 : 1));

const rowsOfKind = (axis, kind) => axis.rows.filter((row) => row.kind === kind);

const bestOf = (rows) => rows.reduce((best, row) => (row.value < best.value ? row : best));

function verdictOf(axis) {
    const ours = rowsOfKind(axis, 'ours')[0];
    const rival = bestOf(rowsOfKind(axis, 'rival'));
    const ratio = ours.value / rival.value;
    if (Math.abs(1 - ratio) < PAR_TOLERANCE) return { isWin: true, text: `On par with ${rival.name}` };
    if (ratio < 1) return { isWin: true, text: `${(1 / ratio).toFixed(2)}× faster than ${rival.name}` };
    return { isWin: false, text: `${ratio.toFixed(2)}× slower than ${rival.name} out of the box` };
}

function AxisBar({ row, maxValue, isShown }) {
    const isOurs = row.kind === 'ours' || row.kind === 'strategy';
    return (
        <div className={styles.storyBar}>
            <div className={styles.storyBarHead}>
                <span className={clsx(isOurs ? styles.storyBarNameOurs : styles.storyBarName, row.kind === 'ceiling' && styles.storyBarNameCeiling)}>
                    {row.name}
                </span>
                <span className={styles.storyBarValue}>{formatValue(row.value)}</span>
            </div>
            <span className={styles.storyBarTrack}>
                <span
                    className={clsx(
                        styles.storyBarFill,
                        row.kind === 'ours' && styles.storyBarFillOurs,
                        row.kind === 'strategy' && styles.storyBarFillStrategy,
                        row.kind === 'ceiling' && styles.storyBarFillCeiling,
                    )}
                    style={{ width: isShown ? `${Math.max(2, (row.value / maxValue) * 100)}%` : '0%' }}
                />
            </span>
        </div>
    );
}

export function AxisStory({ axis, isFlipped }) {
    const [barsRef, , isShown] = useRevealed();
    const maxValue = Math.max(...axis.rows.map((row) => row.value));
    const verdict = verdictOf(axis);
    return (
        <Reveal from={isFlipped ? 'right' : 'left'}>
            <article className={clsx(styles.story, isFlipped && styles.storyFlipped)}>
                <div className={styles.storyText}>
                    <h4 className={styles.storyTitle}>{axis.title}</h4>
                    <p className={styles.storyWhat}>{axis.what}</p>
                    <span className={clsx(styles.storyVerdict, verdict.isWin ? styles.storyVerdictWin : styles.storyVerdictLoss)}>
                        {verdict.text}
                    </span>
                    <Link className={styles.storySource} to={`/docs/benchmarks#${axis.anchor}`}>
                        {axis.unit}, median · <code>.gate/{axis.recording}.json</code>
                    </Link>
                </div>
                <div ref={barsRef} className={styles.storyBars}>
                    {axis.rows.map((row) => (
                        <AxisBar key={row.name} row={row} maxValue={maxValue} isShown={isShown} />
                    ))}
                </div>
            </article>
        </Reveal>
    );
}

export default function LandingSpeed() {
    const mount = LANDING_AXES[0];
    const mountVerdict = verdictOf(mount);
    return (
        <section className={styles.section}>
            <div className="container">
                <Reveal>
                    <p className={styles.eyebrow}>Benchmarks</p>
                    <h2 className={styles.statement}>A framework at the cost of a template engine.</h2>
                    <p className={styles.lead}>
                        Components, state and effects, and reactive when a screen wants it: <code>@exodra/computed</code>{' '}
                        derives ports from fields, and effects subscribe to your own data layer. Each axis below runs the
                        frameworks beside hand-rolled code with no framework in it; the distance to that code is what the
                        abstraction costs, and every figure names the recording it came from.
                    </p>
                </Reveal>
                <Reveal className={styles.trio}>
                    <div className={styles.trioItem}>
                        <span className={styles.trioValue}><span className={styles.trioPrefix}>&lt;</span>{MOUNT_HEADROOM_PERCENT}%</span>
                        <span className={styles.trioLabel}>headroom left above Exodra at mounting</span>
                        <span className={styles.trioFloor}>for any framework, measured against hand-written DOM calls</span>
                        <Link className={styles.trioLink} to="/docs/why/what-the-floor-says">What the floor says →</Link>
                    </div>
                    <div className={styles.trioItem}>
                        <span className={styles.trioValue}>{mountVerdict.text.split(' ')[0]}</span>
                        <span className={styles.trioLabel}>{mountVerdict.text.split(' ').slice(1).join(' ')} on mount</span>
                        <span className={styles.trioFloor}>
                            {formatValue(mount.rows[0].value)} against {formatValue(bestOf(rowsOfKind(mount, 'rival')).value)} ms per app
                        </span>
                        <Link className={styles.trioLink} to="/docs/benchmarks#mount">The mount table →</Link>
                    </div>
                    <div className={styles.trioItem}>
                        <span className={styles.trioValue}>
                            {(GROW_SHRINK_FLOOR.exodraMicroseconds / GROW_SHRINK_FLOOR.floorMicroseconds).toFixed(2)}×
                        </span>
                        <span className={styles.trioLabel}>of hand-written diff code when a list grows and shrinks</span>
                        <span className={styles.trioFloor}>
                            {GROW_SHRINK_FLOOR.exodraMicroseconds} against {GROW_SHRINK_FLOOR.floorMicroseconds} µs per change, rows matched by identity
                        </span>
                        <Link className={styles.trioLink} to="/docs/guides/lists">Lists by identity →</Link>
                    </div>
                </Reveal>
                <div className={styles.stories}>
                    {LANDING_AXES.map((axis, at) => (
                        <AxisStory key={axis.axis} axis={axis} isFlipped={at % 2 === 1} />
                    ))}
                </div>
                <Reveal>
                    <p className={styles.footnote}>
                        Production builds of React 19, Solid 1.9 and eight more libraries, each through its own idiomatic
                        API. Lower is better. <Link to="/docs/benchmarks">Full benchmark and methodology →</Link>
                    </p>
                </Reveal>
            </div>
        </section>
    );
}
