# The apps

**One directory per participant, and each holds that participant's implementation of one app and
nothing else** — no mount adapter, no byte gate, no census reporter, no benchmark plumbing. Those
live in `../participants/<name>/`, under the same name: `apps/mikado/` is the app, and
`participants/mikado/` is the suite's side of it.

```
apps/
  scene/    the app every participant implements, as data and pure functions — nobody's app
  exodra/   six Exodra rows and the two leaf components four of them share
  lit/  mikado/  react/  sinuous/  solid/  stage0/  uhtml/  voby/
  marko/  svelte/     the argument only — their sources are compiler-keyed to ../marko, ../svelte
```

The byte gate is **not** here. Each participant's gate is its `../participants/<name>/` module, and
the shared comparators are `../gates/`.

Two things depend on that separation being real:

1. **The line count.** Every axis that mounts this app prints an `app LOC` column beside the
   medians — how many lines of code the app cost that participant, comments and blank lines
   excluded. It is counted at run time by `scripts/app-sloc.mjs` over **whole files**, listed per
   participant in `../shared/app-files.ts`. Counting whole files needs no rule about what half of a
   file is the app, and a rule is exactly what nobody could check. Put suite machinery in here and
   the number stops meaning what it says.
2. **Reading them.** These are the programs the whole package exists to compare. A reader who wants
   to know what Solid made somebody write, against what the schema core made somebody write, opens
   two files and reads them end to end.

The prose that used to sit between the functions is in the document beside each app — `exodra.md`
beside `exodra.tsx` in `exodra/`, and so on. Nothing was cut: every refusal, every measured table with its
resolution, every trap and every "why the obvious alternative is not taken" is in those documents,
with its numbers intact. What is left in the code is the Rule 15 set — a measured number with its
source, a refusal that would otherwise look like an omission, a constraint imposed from outside the
file, and an argument that stops somebody "fixing" a deliberate shape.

## The scene

`scene/spec.ts` — the app itself, as data and pure functions, shared by every participant so that no
two of them are rendering different content. Ten decks, eight cards each, eighty cards; five users;
four tag positions per card. `scene/spec.md` has the arithmetic and the reasons.

`scene/slot.ts` is there too, and it is the one file in `scene/` that is not the scene: it is the
door a mounted Solid or React app hands its round operation out through. It sits here rather than in
either participant's directory because declaring it inside one would charge the other participant
for that participant's whole app by the line count.

An update round is fixed by `AppHandle.flip` and every participant performs the same one: rename
every deck, toggle every card's details block, advance every card's tag list, advance one user's
setting.

## The participants

| app                          | what it is                                                                                                                                                                                                                                                                                                                                                                                                                 | document                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `exodra/exodra-shared.tsx`   | the tag and the details block, and the props the Exodra rows share                                                                                                                                                                                                                                                                                                                                                         | `exodra/exodra-shared.md`   |
| `exodra/exodra.tsx`          | the schema core, bindable — cells, derivations, `bind`. **NOT A BENCHMARK PARTICIPANT ANY MORE**: it is off `initial-render`, `exodra-initial-render` and `exodra-app-update`, and what still renders it is `app-update`'s null pair and the floor/phase diagnostics (`mount-floor`, `mount-phases`, `teardown-floor`, `child-mark`, `hydrate-floor`, `component-split`), which take its wire as their measurement subject | `exodra/exodra.md`          |
| `exodra/exodra.tsx`          | the same app with no reactive layer: handlers write ports and command regions                                                                                                                                                                                                                                                                                                                                              | `exodra/exodra-direct.md`   |
| `exodra/exodra.tsx`          | the same card as a machine — values, state and children declared over named fields                                                                                                                                                                                                                                                                                                                                         | `exodra/exodra-machine.md`  |
| `exodra/exodra.tsx`          | the same machine with its derivations declared inline, per instance                                                                                                                                                                                                                                                                                                                                                        | `exodra/exodra-inline.md`   |
| `solid/solid.tsx`            | Solid                                                                                                                                                                                                                                                                                                                                                                                                                      | `solid/solid.md`            |
| `react/react.tsx`            | React                                                                                                                                                                                                                                                                                                                                                                                                                      | `react/react.md`            |
| `voby/voby.ts`               | voby                                                                                                                                                                                                                                                                                                                                                                                                                       | `voby/voby.md`              |
| `../svelte/*.svelte`         | Svelte 5                                                                                                                                                                                                                                                                                                                                                                                                                   | `svelte/svelte.md`          |
| `../marko/*.marko`           | Marko 6                                                                                                                                                                                                                                                                                                                                                                                                                    | `marko/marko.md`            |
| `lit/lit.tsx`                | lit-html                                                                                                                                                                                                                                                                                                                                                                                                                   | `lit/lit.md`                |
| `mikado/mikado.tsx`          | Mikado, hand-addressed                                                                                                                                                                                                                                                                                                                                                                                                     | `mikado/mikado.md`          |
| `mikado/mikado-reactive.tsx` | Mikado, written the way its own README says to write one                                                                                                                                                                                                                                                                                                                                                                   | `mikado/mikado-reactive.md` |
| `stage0/stage0.tsx`          | stage0 — the hand-addressed template cloner                                                                                                                                                                                                                                                                                                                                                                                | `stage0/stage0.md`          |
| `uhtml/uhtml.tsx`            | uhtml                                                                                                                                                                                                                                                                                                                                                                                                                      | `uhtml/uhtml.md`            |
| `sinuous/sinuous.tsx`        | sinuous                                                                                                                                                                                                                                                                                                                                                                                                                    | `sinuous/sinuous.md`        |

The Svelte and Marko sources stay in `../svelte/` and `../marko/` because their compilers are keyed
to those paths, so `apps/svelte/` and `apps/marko/` hold only the argument — the roster of
participants stays readable from one `ls` either way. `../shared/app-files.ts` lists those sources
by path like every other app.

## What the axes can and cannot say about these

-   **They render the identical tree.** Every participant is diffed against the reference app's
    markup, byte for byte, at the mount and after an update round, before anything is timed. A run
    where one diverges throws rather than publishing a ranking of two different programs.
-   **A line count is a comparison of source, not of effort.** It says what the library made its
    author write for this app at this size. It says nothing about a different app, and nothing about
    what any of these would cost to maintain.
-   **A shared file is counted for every participant that imports it.** Otherwise the row that reuses
    looks smaller than the row that copies, for no honest reason.
-   **`—` in the column is unmeasured, never small.** It is a row with no app of its own (a floor, a
    null control, a variant declared inside an axis file), or one whose files the counter could not
    read.
-   **The counts are not a ranking.** Two participants can be within a few lines of each other and be
    doing visibly different amounts for the author; the documents beside each app are where that is
    argued.

## The traps

-   **Whitespace is load-bearing in the compiled participants.** Svelte collapses a whitespace-only
    run _between_ two nodes to a single space rather than dropping it, so `CardDyn.svelte` writes its
    markup with no whitespace between tags at all. Marko drops a run that is a newline plus
    indentation but keeps a bare space. Re-indenting either file fails every byte gate. Each file
    carries the one-line version of this; `svelte/svelte.md` and `marko/marko.md` carry the whole
    argument.
-   **The `note…Ops` calls inside a wire, a component or a template stay where they are.** They close
    over per-instance state, and `card-driver.ts` is how `app-update` drives a round without
    dispatching an event. They are app lines because they cannot be anywhere else, and the count says
    so rather than pretending otherwise.
-   **Marko cannot be advanced without a real event.** A mounted template's whole outside surface is
    `{ value, update(input), destroy() }`, so it is not a participant on `app-update` at all. That is
    a property of the framework, stated, not a gap in the measurement.
