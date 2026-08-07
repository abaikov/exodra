import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useBaseUrl from '@docusaurus/useBaseUrl';

/**
 * The interactive dependency graph, embedded the way any other site would embed
 * it: a container, a stylesheet, and the prebuilt runtime from /static.
 *
 * `BrowserOnly` keeps it out of the static render — the runtime needs a DOM, and
 * Docusaurus renders every page in Node first. The `webpackIgnore` comment
 * matters too: the runtime is a finished bundle served as a static asset, and
 * webpack must fetch it at runtime rather than try to build it.
 */
export default function DependencyGraph() {
    const base = useBaseUrl('/monorepo-atlas/');

    // The hooks live in Graph, NOT in this render prop. BrowserOnly calls its
    // children as a function on the client only, so hooks written inline here
    // would be absent on the first render and present on the second — exactly
    // the "change in the order of Hooks" React refuses to accept.
    return (
        <BrowserOnly fallback={<p>Loading the dependency graph…</p>}>
            {() => <Graph base={base} />}
        </BrowserOnly>
    );
}

function Graph({ base }) {
    const ref = React.useRef(null);

    React.useEffect(() => {
        const style = document.createElement('link');
        style.rel = 'stylesheet';
        style.href = `${base}graph.css`;
        document.head.appendChild(style);

        let explorer;
        let cancelled = false;

        import(/* webpackIgnore: true */ `${base}graph.js`)
            .then(module => {
                if (cancelled || !ref.current) return;
                // One entry point for loading published artefacts — the page
                // does not need to know the file layout.
                return module
                    .mountFromUrl(ref.current, `${base}graph.json`)
                    .then(mounted => {
                        if (cancelled) mounted.dispose();
                        else explorer = mounted;
                    });
            })
            .catch(error => {
                if (ref.current) {
                    ref.current.textContent = `Could not load the dependency graph (${error.message}).`;
                }
            });

        return () => {
            cancelled = true;
            explorer?.dispose();
            style.remove();
        };
    }, [base]);

    return <div ref={ref} style={{ minHeight: '32rem' }} />;
}
