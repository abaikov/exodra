// DIAGNOSTIC — THE CLONE THRESHOLD: how big does a template have to be before cloning a
// prototype beats building its elements one by one?
//
// The schema core's DOM backend has exactly one construction strategy: `compileExoDomSchema`
// parses the component's markup once into a prototype element, and every instance is
// `proto.cloneNode(true)` followed by a replay of the schema's walk and the wiring call. That is
// unconditional — an 801-element app and a bare `<li>` are built the same way — and two CPU
// profiles taken in this repo say the two cases are not alike:
//
//   * mounting the 80-card todo app 400 times, `cloneNode` costs 48 ms here and 44 ms in
//     Mikado for the same app. On a big static subtree cloning is not where anything is lost.
//   * building the rows of a 300-row list, where a row is one `<li>` with one text port,
//     `cloneNode` costs 32 ms where the LEGACY renderer's `createElement` costs 14 ms for the
//     same rows. On a one-element template a clone is 2.3× the cost of just making the element.
//
// So there LOOKED to be a crossover somewhere between one element and eighty cards, and NOBODY
// HAD MEASURED WHERE. This axis is that measurement and nothing else.
//
// THE ANSWER IS THAT THERE IS NO CROSSOVER, and it is written here rather than in a commit
// message because the profiles above are still on the page and the next person to read them will
// have exactly the same idea. Per 200 instances, medians in ms, from a real run of this axis at
// batch 10 — so these are the numbers as printed, and the resolution note further down is about
// how to read a run you take yourself, not these:
//
//   size   1 element      manual 0.080    clone 0.080     tie
//   size   2 elements     manual 0.130    clone 0.110     clone wins
//   size   3 elements     manual 0.190    clone 0.150     clone wins
//   size   5 elements     manual 0.330    clone 0.230     clone 1.4×
//   size  10 elements     manual 0.680    clone 0.380     clone 1.8×
//   size  25 elements     manual 1.790    clone 0.840     clone 2.1×
//
// Cloning ties at one element and wins from two elements upward, so there is no size at which
// straight-line construction pays and the strategy was REMOVED from `@exodra/dom` rather than
// left in place behind a disabled flag — a branch nothing can ever take is not a switch, it is
// dead weight sitting in the hot path of the schema compiler and of every instance build. The two
// profiles that motivated the hypothesis are not thereby explained. HISTORICAL MEASUREMENT,
// kept for provenance and NOT reproducible: against the three-props renderer this repo used to
// ship, the 300-row list cost 32 ms where that renderer cost 14 ms. That renderer has since
// been deleted, so the comparison cannot be re-run — but whatever the 18 ms was, it was
// somewhere other than `createElement` vs `cloneNode`, and that is where a next investigation
// should start.
//
// WHAT IS HELD FIXED. Six template SIZES — 1, 2, 3, 5, 10, 25 elements — each with exactly ONE
// text port, so that the fill is the same constant on every size and on both sides and the only
// variable left is how many elements have to come into existence. The shapes are ordinary
// markup rather than a chain of nested `<div>`s: a list row, a labelled row, a card. A template
// with no port at all is not the case in question (nothing would need building per instance),
// which is why every shape has one.
//
// THE TWO WAYS.
//
//   `clone`  — the SHIPPED path, entered where an application enters it: `ExoDomBackend.render`
//              with a real `createExoMachine`. Per instance that is one `cloneNode(true)`, the walk
//              replay that resolves the port's element, and the wire's one `c.set`.
//   `manual` — the identical DOM built straight-line with `document.createElement`,
//              `setAttribute`, `appendChild` and `textContent`, hand-written per shape below.
//              No walk: the port's element is a local variable, because a cursor that made the
//              element knows where it is.
//
// `clone` ALSO CARRIES `ExoDomBackend.render`'s FIXED SETUP inside the timed region — one
// teardown scope (and an `exoContextAt` walk out of the container beside it, until that walk was
// removed), and `manual` has no equivalent.
// It is left in because the entry point is what an application actually calls, and it is named
// here because the smallest shape is where a fixed cost is most able to hide.
//
// THAT SETUP IS NOW PAID PER INSTANCE, not once per 200. `render` mounts ONE instance, so the
// 200 are a loop of 200 calls — which is what an application writes — and every call pays its own
// context walk and teardown scope. Two DOM hops and two allocations against one clone-plus-walk
// is small, but it is no longer amortised across the batch, and every number in the table above
// was recorded when it was. Those numbers are provenance, not a baseline to compare a fresh run
// against.
//
// THAT IS A COMPARISON OF WHOLE PATHS, ON PURPOSE. Timing `cloneNode` against `createElement`
// in isolation answers a question nobody is asking — the backend cannot adopt "createElement"
// without also adopting what it does to the rest of the per-instance work. So `clone` carries
// its walk and `manual` does not, because that is the difference an application would actually
// get.
//
// AND THAT MAKES `manual` A CEILING RATHER THAN A FORECAST — which is what makes the result
// above conclusive rather than merely discouraging. A real cursor inside the backend would keep
// the walk replay exactly as it is, swapping only how the nodes come into existence, so that
// port resolution and event wiring stay one implementation instead of two. It would therefore
// capture the CONSTRUCTION part of whatever gap appears here and not the walk part. `manual`
// here does NOT replay the walk and still loses from two elements up, so the real mechanism —
// which would have carried the walk as well — could only have done worse.
//
// HOW TO READ THE OUTPUT: six tables, one per size, each with two rows. The threshold would be
// the LARGEST size at which `manual` is still faster than `clone`; in the run recorded above
// there is no such size, because `manual` never wins.
import { type TExoTextPort } from '@exodra/core';
import { ExoDomBackend, type TExoDomMachine, type TExoDomNode, withExoCompiler } from '@exodra/dom';
import { abBench, type Scenario } from '../../../harness';
import { createExoSchema } from '@exodra/core';
import { createExoMachine } from '@exodra/core';

/**
 * THE ONE BACKEND THIS FILE RENDERS THROUGH, built at module level because a backend is the schema
 * cache key and is compared by POINTER: a fresh one per scenario would recompile every shape's
 * prototype — markup parse included — inside the timed region, which is the one thing this axis
 * is trying to measure the absence of.
 */
const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

/**
 * Instances built inside ONE timed region.
 *
 * Held constant across the sizes so a size's number is per-instance-comparable with every
 * other size's, and large enough that the smallest shape (one `<li>`) still lands far above
 * the browser's 0.1 ms clock clamp. At the biggest shape it is 5 000 elements per sample,
 * which is the same order as the 80-card app this suite already mounts five at a time.
 */
const INSTANCES = 200;

/** Instances the markup gate builds. Three, because one cannot show a wrong separator. */
const GATE_N = 3;

/**
 * The per-instance text, and the ONE thing both ways compute rather than carry.
 *
 * Both sides pay this same concatenation exactly once per instance — the wire does it before
 * `c.set`, the straight-line cursor before `textContent`. Every OTHER string in a shape is a
 * literal on both sides, because a static label is baked into the prototype's markup and a
 * `manual` cursor that rebuilt it per instance would be paying a cost the clone path does not.
 *
 * THE INDEX IS `0` ON EVERY INSTANCE NOW, on both sides: `ExoDomBackend.render` mounts one
 * instance and hands it `0`, so the shapes' `row N` comments above should be read as `row 0`
 * throughout. The concatenation still happens per instance; only the number in it stopped moving.
 */
const textOf = (index: number): string => 'row ' + index;

/**
 * ONE TEMPLATE SIZE: the same tree expressed as a component and as hand-written DOM calls.
 *
 * `size` is asserted against the tree the gate actually builds, so a shape whose element count
 * drifts away from its label fails instead of quietly mislabelling the axis that decides a
 * threshold measured in elements.
 */
type TShape = {
    readonly size: number;
    readonly label: string;
    readonly component: TExoDomMachine;
    /** Build ONE instance straight-line and append it to `parent`. */
    readonly manual: (parent: Element, index: number) => void;
};

// ─────────────────────────────────────────────────────────────────────────── size 1
// `<li class="row">row N</li>` — the shape the second profile was taken on.

const SHAPE_1_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('li', { class: 'row' }, (li) => {
        text = li.textPort();
    });
    return { text };
});
const mSHAPE_1 = createExoMachine<TExoDomNode>(SHAPE_1_SCHEMA, {
    createInitialState: (c) => {
        c.text(SHAPE_1_SCHEMA.ports.text, textOf(0));
    },
});
const SHAPE_1 = mSHAPE_1;

// `setAttribute('class', …)` and not `className = …` throughout, even though the property is
// the faster of the two. This side is the baseline for a strategy the COMPILER would emit, and
// the compiler writes attributes the way the markup spells them (see `exo-attr-setter` for
// what it costs to answer "is this name a property?" — an answer only the prototype has). A
// baseline hand-tuned past what the mechanism could emit would set the threshold too high.
function manual1(parent: Element, index: number): void {
    const li = document.createElement('li');
    li.setAttribute('class', 'row');
    li.textContent = textOf(index);
    parent.appendChild(li);
}

// ─────────────────────────────────────────────────────────────────────────── size 2
// `<li class="row"><span class="label">row N</span></li>`

const SHAPE_2_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('li', { class: 'row' }, (li) => {
        li.el('span', { class: 'label' }, (span) => {
            text = span.textPort();
        });
    });
    return { text };
});
const mSHAPE_2 = createExoMachine<TExoDomNode>(SHAPE_2_SCHEMA, {
    createInitialState: (c) => {
        c.text(SHAPE_2_SCHEMA.ports.text, textOf(0));
    },
});
const SHAPE_2 = mSHAPE_2;

function manual2(parent: Element, index: number): void {
    const li = document.createElement('li');
    li.setAttribute('class', 'row');
    const span = document.createElement('span');
    span.setAttribute('class', 'label');
    span.textContent = textOf(index);
    li.appendChild(span);
    parent.appendChild(li);
}

// ─────────────────────────────────────────────────────────────────────────── size 3
// `<li class="row"><span class="tag">#</span><b>row N</b></li>`

const SHAPE_3_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('li', { class: 'row' }, (li) => {
        li.el('span', { class: 'tag' }, (span) => {
            span.text('#');
        });
        li.el('b', null, (bold) => {
            text = bold.textPort();
        });
    });
    return { text };
});
const mSHAPE_3 = createExoMachine<TExoDomNode>(SHAPE_3_SCHEMA, {
    createInitialState: (c) => {
        c.text(SHAPE_3_SCHEMA.ports.text, textOf(0));
    },
});
const SHAPE_3 = mSHAPE_3;

function manual3(parent: Element, index: number): void {
    const li = document.createElement('li');
    li.setAttribute('class', 'row');
    const tag = document.createElement('span');
    tag.setAttribute('class', 'tag');
    tag.textContent = '#';
    li.appendChild(tag);
    const bold = document.createElement('b');
    bold.textContent = textOf(index);
    li.appendChild(bold);
    parent.appendChild(li);
}

// ─────────────────────────────────────────────────────────────────────────── size 5
// A row with an icon and a two-part body — the first shape with real nesting.

const SHAPE_5_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('li', { class: 'row' }, (li) => {
        li.el('span', { class: 'icon' }, (span) => {
            span.text('*');
        });
        li.el('div', { class: 'body' }, (body) => {
            body.el('span', { class: 'label' }, (span) => {
                span.text('Task');
            });
            body.el('b', { class: 'value' }, (value) => {
                text = value.textPort();
            });
        });
    });
    return { text };
});
const mSHAPE_5 = createExoMachine<TExoDomNode>(SHAPE_5_SCHEMA, {
    createInitialState: (c) => {
        c.text(SHAPE_5_SCHEMA.ports.text, textOf(0));
    },
});
const SHAPE_5 = mSHAPE_5;

function manual5(parent: Element, index: number): void {
    const li = document.createElement('li');
    li.setAttribute('class', 'row');
    const icon = document.createElement('span');
    icon.setAttribute('class', 'icon');
    icon.textContent = '*';
    li.appendChild(icon);
    const body = document.createElement('div');
    body.setAttribute('class', 'body');
    const label = document.createElement('span');
    label.setAttribute('class', 'label');
    label.textContent = 'Task';
    body.appendChild(label);
    const value = document.createElement('b');
    value.setAttribute('class', 'value');
    value.textContent = textOf(index);
    body.appendChild(value);
    li.appendChild(body);
    parent.appendChild(li);
}

// ────────────────────────────────────────────────────────────────────────── size 10
// A small card: head with icon/title/badge, two body lines, a footer with one button.

const SHAPE_10_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('li', { class: 'card' }, (li) => {
        li.el('div', { class: 'card-head' }, (head) => {
            head.el('span', { class: 'card-icon' }, (span) => {
                span.text('*');
            });
            head.el('h4', { class: 'card-title' }, (title) => {
                text = title.textPort();
            });
            head.el('span', { class: 'card-badge' }, (span) => {
                span.text('new');
            });
        });
        li.el('div', { class: 'card-body' }, (body) => {
            body.el('p', { class: 'card-line' }, (p) => {
                p.text('First line of the card body');
            });
            body.el('p', { class: 'card-line' }, (p) => {
                p.text('Second line of the card body');
            });
        });
        li.el('div', { class: 'card-foot' }, (foot) => {
            foot.el('button', { class: 'card-action', type: 'button' }, (button) => {
                button.text('Open');
            });
        });
    });
    return { text };
});
const mSHAPE_10 = createExoMachine<TExoDomNode>(SHAPE_10_SCHEMA, {
    createInitialState: (c) => {
        c.text(SHAPE_10_SCHEMA.ports.text, textOf(0));
    },
});
const SHAPE_10 = mSHAPE_10;

function manual10(parent: Element, index: number): void {
    const li = document.createElement('li');
    li.setAttribute('class', 'card');

    const head = document.createElement('div');
    head.setAttribute('class', 'card-head');
    const icon = document.createElement('span');
    icon.setAttribute('class', 'card-icon');
    icon.textContent = '*';
    head.appendChild(icon);
    const title = document.createElement('h4');
    title.setAttribute('class', 'card-title');
    title.textContent = textOf(index);
    head.appendChild(title);
    const badge = document.createElement('span');
    badge.setAttribute('class', 'card-badge');
    badge.textContent = 'new';
    head.appendChild(badge);
    li.appendChild(head);

    const body = document.createElement('div');
    body.setAttribute('class', 'card-body');
    const line1 = document.createElement('p');
    line1.setAttribute('class', 'card-line');
    line1.textContent = 'First line of the card body';
    body.appendChild(line1);
    const line2 = document.createElement('p');
    line2.setAttribute('class', 'card-line');
    line2.textContent = 'Second line of the card body';
    body.appendChild(line2);
    li.appendChild(body);

    const foot = document.createElement('div');
    foot.setAttribute('class', 'card-foot');
    const open = document.createElement('button');
    open.setAttribute('class', 'card-action');
    open.setAttribute('type', 'button');
    open.textContent = 'Open';
    foot.appendChild(open);
    li.appendChild(foot);

    parent.appendChild(li);
}

// ────────────────────────────────────────────────────────────────────────── size 25
// The same card grown to four key/value rows and a three-button action bar. Everything static
// in it is a LITERAL on both sides — the four rows are written out rather than looped, because
// a loop building `'field ' + r` would charge the straight-line side for strings the clone side
// gets free inside its prototype's markup.

const SHAPE_25_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('li', { class: 'card' }, (li) => {
        li.el('div', { class: 'card-head' }, (head) => {
            head.el('span', { class: 'card-icon' }, (span) => {
                span.text('*');
            });
            head.el('h4', { class: 'card-title' }, (title) => {
                text = title.textPort();
            });
            head.el('span', { class: 'card-badge' }, (span) => {
                span.text('new');
            });
        });
        li.el('div', { class: 'card-body' }, (body) => {
            body.el('div', { class: 'card-row' }, (row) => {
                row.el('span', { class: 'k' }, (k) => {
                    k.text('Owner');
                });
                row.el('span', { class: 'v' }, (v) => {
                    v.text('unassigned');
                });
            });
            body.el('div', { class: 'card-row' }, (row) => {
                row.el('span', { class: 'k' }, (k) => {
                    k.text('Status');
                });
                row.el('span', { class: 'v' }, (v) => {
                    v.text('open');
                });
            });
            body.el('div', { class: 'card-row' }, (row) => {
                row.el('span', { class: 'k' }, (k) => {
                    k.text('Priority');
                });
                row.el('span', { class: 'v' }, (v) => {
                    v.text('normal');
                });
            });
            body.el('div', { class: 'card-row' }, (row) => {
                row.el('span', { class: 'k' }, (k) => {
                    k.text('Estimate');
                });
                row.el('span', { class: 'v' }, (v) => {
                    v.text('none');
                });
            });
        });
        li.el('div', { class: 'card-sep' });
        li.el('div', { class: 'card-foot' }, (foot) => {
            foot.el('span', { class: 'card-meta' }, (span) => {
                span.text('updated');
            });
            foot.el('div', { class: 'card-actions' }, (actions) => {
                actions.el('button', { class: 'card-action', type: 'button' }, (button) => {
                    button.text('Open');
                });
                actions.el('button', { class: 'card-action', type: 'button' }, (button) => {
                    button.text('Edit');
                });
                actions.el('button', { class: 'card-action', type: 'button' }, (button) => {
                    button.text('Delete');
                });
            });
        });
    });
    return { text };
});
const mSHAPE_25 = createExoMachine<TExoDomNode>(SHAPE_25_SCHEMA, {
    createInitialState: (c) => {
        c.text(SHAPE_25_SCHEMA.ports.text, textOf(0));
    },
});
const SHAPE_25 = mSHAPE_25;

function manual25(parent: Element, index: number): void {
    const li = document.createElement('li');
    li.setAttribute('class', 'card');

    const head = document.createElement('div');
    head.setAttribute('class', 'card-head');
    const icon = document.createElement('span');
    icon.setAttribute('class', 'card-icon');
    icon.textContent = '*';
    head.appendChild(icon);
    const title = document.createElement('h4');
    title.setAttribute('class', 'card-title');
    title.textContent = textOf(index);
    head.appendChild(title);
    const badge = document.createElement('span');
    badge.setAttribute('class', 'card-badge');
    badge.textContent = 'new';
    head.appendChild(badge);
    li.appendChild(head);

    const body = document.createElement('div');
    body.setAttribute('class', 'card-body');

    const row1 = document.createElement('div');
    row1.setAttribute('class', 'card-row');
    const k1 = document.createElement('span');
    k1.setAttribute('class', 'k');
    k1.textContent = 'Owner';
    row1.appendChild(k1);
    const v1 = document.createElement('span');
    v1.setAttribute('class', 'v');
    v1.textContent = 'unassigned';
    row1.appendChild(v1);
    body.appendChild(row1);

    const row2 = document.createElement('div');
    row2.setAttribute('class', 'card-row');
    const k2 = document.createElement('span');
    k2.setAttribute('class', 'k');
    k2.textContent = 'Status';
    row2.appendChild(k2);
    const v2 = document.createElement('span');
    v2.setAttribute('class', 'v');
    v2.textContent = 'open';
    row2.appendChild(v2);
    body.appendChild(row2);

    const row3 = document.createElement('div');
    row3.setAttribute('class', 'card-row');
    const k3 = document.createElement('span');
    k3.setAttribute('class', 'k');
    k3.textContent = 'Priority';
    row3.appendChild(k3);
    const v3 = document.createElement('span');
    v3.setAttribute('class', 'v');
    v3.textContent = 'normal';
    row3.appendChild(v3);
    body.appendChild(row3);

    const row4 = document.createElement('div');
    row4.setAttribute('class', 'card-row');
    const k4 = document.createElement('span');
    k4.setAttribute('class', 'k');
    k4.textContent = 'Estimate';
    row4.appendChild(k4);
    const v4 = document.createElement('span');
    v4.setAttribute('class', 'v');
    v4.textContent = 'none';
    row4.appendChild(v4);
    body.appendChild(row4);

    li.appendChild(body);

    const sep = document.createElement('div');
    sep.setAttribute('class', 'card-sep');
    li.appendChild(sep);

    const foot = document.createElement('div');
    foot.setAttribute('class', 'card-foot');
    const meta = document.createElement('span');
    meta.setAttribute('class', 'card-meta');
    meta.textContent = 'updated';
    foot.appendChild(meta);
    const actions = document.createElement('div');
    actions.setAttribute('class', 'card-actions');
    const open = document.createElement('button');
    open.setAttribute('class', 'card-action');
    open.setAttribute('type', 'button');
    open.textContent = 'Open';
    actions.appendChild(open);
    const edit = document.createElement('button');
    edit.setAttribute('class', 'card-action');
    edit.setAttribute('type', 'button');
    edit.textContent = 'Edit';
    actions.appendChild(edit);
    const del = document.createElement('button');
    del.setAttribute('class', 'card-action');
    del.setAttribute('type', 'button');
    del.textContent = 'Delete';
    actions.appendChild(del);
    foot.appendChild(actions);
    li.appendChild(foot);

    parent.appendChild(li);
}

const SHAPES: readonly TShape[] = [
    { size: 1, label: 'li-text', component: SHAPE_1, manual: manual1 },
    { size: 2, label: 'li-span', component: SHAPE_2, manual: manual2 },
    { size: 3, label: 'li-tag-b', component: SHAPE_3, manual: manual3 },
    { size: 5, label: 'row-icon-body', component: SHAPE_5, manual: manual5 },
    { size: 10, label: 'card-small', component: SHAPE_10, manual: manual10 },
    { size: 25, label: 'card-rows', component: SHAPE_25, manual: manual25 },
];

function el(): HTMLElement {
    const c = document.createElement('div');
    document.body.appendChild(c);
    return c;
}

/**
 * REQUIRE THE TWO WAYS TO HAVE BUILT THE SAME BYTES, before either is timed.
 *
 * This is the whole precondition of the axis. A straight-line cursor that forgot an attribute,
 * merged two text nodes or dropped an empty `<div>` would come out FASTER, and nothing in a
 * timing harness can tell that apart from a win — the number would simply be smaller. So the
 * markup is compared exactly, with no comment stripping and no normalisation: neither way emits
 * a marker of any kind here, so there is nothing to forgive.
 *
 * The element count is checked against the shape's declared `size` in the same pass, because
 * that label is what the resulting threshold is expressed in. A shape quietly grown by one
 * element would move the answer without changing a single number in the tables.
 */
// THIS AXIS IS THE ONE PLACE A FLOOR'S INPUT WAS CHANGED RATHER THAN ITS DATA SOURCE, and the
// argument for it is specific to what is being measured here — it is NOT a precedent.
//
// `ssr-floor`, `one-and-static` and `hydrate-floor` all met the same fact (`render` mounts one
// instance and hands it no per-instance input) and all three answered it the same way: give the component a real
// per-row source, a list, because their numbers are ABOUT per-row content. Making their floors
// stop counting would have been making the floor lie.
//
// THIS AXIS IS ABOUT SUBTREE SIZE. What it answers is "at how many elements does cloning a
// prototype beat building the nodes", and the only term in that question is the SHAPE. A port
// whose text reads `row 0` on every instance costs exactly what one reading `row 7` costs — one
// store of one string — so the threshold is untouched by the two sides agreeing on `0`, while a
// list wrapper WOULD move it by putting reconciliation machinery inside the timed region on one
// side only.
//
// WHAT IT COSTS, STATED: the instances within a run are now identical, so this axis can no longer
// see anything that depends on their CONTENT differing. Nothing it claims depends on that. — my
// judgement, not a measurement; the number to distrust if it is wrong is the threshold itself.
function gateShape(shape: TShape): void {
    const cloned = el();
    const offs: (() => void)[] = [];
    for (let i = 0; i < GATE_N; i++) offs.push(EXO_BACKEND.render(shape.component, cloned));
    const dispose = (): void => {
        for (const off of offs) off();
    };
    const made = el();
    // `row 0` ON BOTH SIDES, AND THE AXIS CHANGED SHAPE HERE. `render` mounts ONE instance and
    // hands it no params, so every shape writes `textOf(0)` and the N instances this loop builds are now
    // IDENTICAL where they used to read the entry point's per-instance number and say "row 0",
    // "row 1", … The straight-line side is passed `0` for the same reason, unchanged in every
    // other respect: if it kept counting, the two ways would build different bytes and the gate
    // below — the whole precondition of the axis — would refuse to run. A number recorded before
    // this change is NOT comparable with one recorded after it: both sides still pay one
    // concatenation per instance, but the string is now the same string every time.
    for (let i = 0; i < GATE_N; i++) shape.manual(made, 0);

    const want = cloned.innerHTML;
    const got = made.innerHTML;
    const wantN = cloned.querySelectorAll('*').length;
    const gotN = made.querySelectorAll('*').length;
    dispose();
    cloned.remove();
    made.remove();

    if (want !== got) {
        throw new Error(
            `clone-threshold/${shape.label}: the two ways build DIFFERENT markup — ` +
                `${wantN} elements (clone) / ${gotN} elements (manual) — so timing them ` +
                'against each other would compare two different programs.\n' +
                `  clone : ${want}\n` +
                `  manual: ${got}`
        );
    }
    if (wantN !== shape.size * GATE_N) {
        throw new Error(
            `clone-threshold/${shape.label}: declared as ${shape.size} elements but built ` +
                `${wantN / GATE_N} — the threshold this axis produces is measured in elements, ` +
                'so a mislabelled shape mislabels the answer'
        );
    }
    // eslint-disable-next-line no-console
    console.log(
        `✅ gate clone-threshold/${shape.label}: identical markup, ` +
            `${shape.size} elements per instance, ${want.length} chars for ${GATE_N}`
    );
}

export async function benchmarkCloneThreshold(rounds = 60, batch = 1): Promise<void> {
    for (const shape of SHAPES) gateShape(shape);

    for (const shape of SHAPES) {
        const clonePrep = (): Scenario => {
            const c = el();
            // ALLOCATED IN `prep`, FILLED BY INDEX IN THE REGION. The straight-line side keeps no
            // disposers at all, so an array grown inside the timed loop would be charging `clone`
            // for bookkeeping the comparison does not contain.
            const offs: (() => void)[] = new Array<() => void>(INSTANCES);
            return {
                measure: () => {
                    // THE LOOP IS NOW IN THE TIMED REGION, and it is what an application writes:
                    // `render` mounts one instance, so N instances are N calls. That moves
                    // `render`'s fixed setup — one teardown scope, and one `exoContextAt` walk
                    // beside it until that walk was removed —
                    // described in this file's header as "per 200 instances" — to PER INSTANCE.
                    // Both are still small beside 200 clones, and both are still on the `clone`
                    // side only; but a number recorded before this change is not comparable with
                    // one recorded after it.
                    for (let i = 0; i < INSTANCES; i++)
                        offs[i] = EXO_BACKEND.render(shape.component, c);
                },
                cleanup: () => {
                    for (const off of offs) off();
                    c.remove();
                },
            };
        };

        const manualPrep = (): Scenario => {
            const c = el();
            const build = shape.manual;
            return {
                measure: () => {
                    // `0`, not `i` — see `gateShape`: the clone side builds identical instances
                    // now, and a straight-line side that kept counting would be building
                    // different bytes from the side it is timed against.
                    for (let i = 0; i < INSTANCES; i++) build(c, 0);
                },
                cleanup: () => {
                    c.remove();
                },
            };
        };

        // `clone` IS LISTED FIRST and that is load-bearing: `abBench` anchors its "rank / N ×
        // faster than" line on `exodra` when it is present and otherwise on the FIRST name it
        // was given, so this reads as the shipped path measured against the alternative rather
        // than the other way round.
        await abBench(
            `CLONE THRESHOLD — ${INSTANCES} instances of a ${shape.size}-element template ` +
                `(${shape.label}): clone+patch vs straight-line createElement`,
            `ms/${INSTANCES} instances`,
            { clone: clonePrep, manual: manualPrep } as never,
            { rounds, batch }
        );
    }

    // eslint-disable-next-line no-console
    console.log(
        '✅ clone-threshold: the crossover is the LARGEST size above at which `manual` still ' +
            'beats `clone`. A recorded run at batch 10 found no such size — `manual` tied at one ' +
            'element and lost from two upward, by 2.1× at 25 — so @exodra/dom builds every ' +
            'instance by cloning its prototype and carries no second strategy. See this file’s ' +
            'header for that run. A run that disagrees is worth reporting; a run that agrees is ' +
            'a confirmation and changes nothing.'
    );
}
