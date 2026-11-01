export const LANDING_AXES = [
    {
        axis: 'initial-render',
        recording: 'initial-render.calls-full-2026-11-01',
        anchor: 'mount',
        unit: 'ms / mount',
        title: 'Mounting an 80-card app.',
        what: 'Every card with a details toggle and its own tag list, built from nothing into the page.',
        rows: [
            { name: 'Exodra', value: 0.48, kind: 'ours' },
            { name: 'Mikado', value: 0.74, kind: 'rival' },
            { name: 'Solid', value: 0.82, kind: 'rival' },
            { name: 'React', value: 1.06, kind: 'rival' },
            { name: 'stage0, hand-rolled, no framework', value: 0.52, kind: 'ceiling' },
        ],
    },
    {
        axis: 'reconcile',
        recording: 'reconcile.rec1',
        anchor: 'reconcile',
        unit: 'ms / 30 reconciles',
        title: 'Replacing a 200-row list with a shuffle of it.',
        what: 'Rows are matched by the identity of their data, so a row that survives is the same element it was.',
        rows: [
            { name: 'Exodra', value: 1.18, kind: 'ours' },
            { name: 'sinuous', value: 1.35, kind: 'rival' },
            { name: 'Solid', value: 2.01, kind: 'rival' },
            { name: 'React', value: 4.715, kind: 'rival' },
            { name: 'stage0, hand-rolled, no framework', value: 1.565, kind: 'ceiling' },
        ],
    },
    {
        axis: 'app-update',
        recording: 'app-update.calls-full-2026-11-01',
        anchor: 'application-update',
        unit: 'ms / 40 rounds',
        title: 'Updating the same 80 cards, forty rounds over.',
        what: 'Details blocks open and close and tag lists grow and shrink across all 80 cards.',
        rows: [
            { name: 'Exodra', value: 4.6, kind: 'ours' },
            { name: 'Mikado', value: 8.9, kind: 'rival' },
            { name: 'Lit', value: 15.6, kind: 'rival' },
            { name: 'Solid', value: 19.0, kind: 'rival' },
            { name: 'React', value: 21.8, kind: 'rival' },
            { name: 'stage0, hand-rolled, no framework', value: 4.6, kind: 'ceiling' },
        ],
    },
];

export const REACT_AXES = [
    {
        axis: 'initial-render',
        recording: 'initial-render.calls-full-2026-11-01',
        anchor: 'mount',
        unit: 'ms / mount',
        title: 'Mounting the same 80-card app, written in React.',
        what: 'One React source, rendered by React 19 and by Exodra through @exodra/react-compat.',
        rows: [
            { name: 'React code on Exodra, compiled', value: 0.82, kind: 'ours' },
            { name: 'React code on Exodra, no compiler', value: 0.92, kind: 'strategy' },
            { name: 'React code on Exodra, templates off', value: 1.31, kind: 'rival' },
            { name: 'React 19', value: 0.98, kind: 'rival' },
        ],
    },
    {
        axis: 'app-update',
        recording: 'app-update.calls-full-2026-11-01',
        anchor: 'application-update',
        unit: 'ms / 40 rounds',
        title: 'Updating it, forty rounds over.',
        what: 'The same hooks and the same re-renders; only the renderer underneath differs.',
        rows: [
            { name: 'React code on Exodra, compiled', value: 8.4, kind: 'ours' },
            { name: 'React code on Exodra, no compiler', value: 9.5, kind: 'strategy' },
            { name: 'React code on Exodra, templates off', value: 13.8, kind: 'rival' },
            { name: 'React 19', value: 11.0, kind: 'rival' },
        ],
    },
    {
        axis: 'react-libraries',
        recording: 'react-libraries.second-2026-11-01',
        anchor: 'react-libraries',
        unit: 'ms / 20 rounds',
        title: 'With zustand and react-query doing the updates.',
        what: '200 rows, each reading a zustand selector and a react-query query; every round writes 40 counts to the store and 40 labels to the query cache.',
        rows: [
            { name: 'React code on Exodra, compiled', value: 4.7, kind: 'ours' },
            { name: 'React code on Exodra, no compiler', value: 5.1, kind: 'strategy' },
            { name: 'React 19', value: 6.9, kind: 'rival' },
        ],
    },
];

export const REACT_LIBRARIES = [
    'react-router',
    'TanStack Query',
    'SWR',
    'Zustand',
    'Jotai',
    'React Redux',
    'React Hook Form',
    'Formik',
    'Framer Motion',
    'Headless UI',
    'Radix Dialog',
    'Emotion',
    'styled-components',
    'react-i18next',
    'react-window',
];

export const MOUNT_HEADROOM_PERCENT = 30;

export const GROW_SHRINK_FLOOR = {
    recording: 'update-floor.shuffled',
    exodraMicroseconds: 6.0938,
    floorMicroseconds: 6.0938,
};
