import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Fast by Design',
    description: (
      <>
        Direct DOM writes, no virtual-DOM diffing, and op-based lists that stay
        cheap where reactive frameworks usually struggle. In our own benchmark
        suite Exodra leads on large-tree render — reproduce it with{' '}
        <code>npm run bench</code>.
      </>
    ),
  },
  {
    title: 'Small & Transparent',
    description: (
      <>
        Tiny runtime without compile magic. No worries about heavy code transformations.
        Perfect as a framework for small landing pages and micro-frontends.
        What you write is what runs.
      </>
    ),
  },
  {
    title: 'Modern Developer Experience',
    description: (
      <>
        Full TypeScript support, JSX, hot module replacement, and a powerful
        Babel plugin for compile-time optimizations.
        <br/>
        CNStra-OIMDB ecosystem for building complex applications.
      </>
    ),
  },
];

function Feature({title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
