export const LANDING_AXES = [
    {
        axis: 'initial-render',
        recording: 'initial-render.post-repair',
        anchor: 'mount',
        unit: 'ms / mount',
        title: 'Mounting an 80-card app.',
        what: 'Every card with a details toggle and its own tag list, built from nothing into the page.',
        rows: [
            { name: 'Exodra', value: 0.385, kind: 'ours' },
            { name: 'Solid', value: 0.485, kind: 'rival' },
            { name: 'React', value: 0.775, kind: 'rival' },
            { name: 'stage0, hand-rolled, no framework', value: 0.325, kind: 'ceiling' },
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
        recording: 'app-update.rec1',
        anchor: 'application-update',
        unit: 'ms / 5 rounds',
        title: 'Updating the same 80 cards, five rounds over.',
        what: 'Details blocks open and close and tag lists grow and shrink across all 80 cards.',
        rows: [
            { name: 'Exodra', value: 4.595, kind: 'ours' },
            { name: 'Lit', value: 4.915, kind: 'rival' },
            { name: 'Solid', value: 5.48, kind: 'rival' },
            { name: 'React', value: 9.335, kind: 'rival' },
            { name: 'stage0, hand-rolled, no framework', value: 4.41, kind: 'ceiling' },
        ],
    },
];

export const MOUNT_HEADROOM_PERCENT = 30;

export const GROW_SHRINK_FLOOR = {
    recording: 'update-floor.shuffled',
    exodraMicroseconds: 6.0938,
    floorMicroseconds: 6.0938,
};
