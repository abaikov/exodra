// AXIS PARTICIPANT — ANGULAR, BUILT ON ITS OWN. THE same 80-card todo app as
// `src/benchmarks/participants/bundled/todo-app.tsx`'s app, written once more against Angular.
// Same data
// (imported from the framework-free `todo-spec`, never re-declared), same cards, same details
// toggle, same dynamic tag list, same two handlers, same update round.
//
// WHY THIS PARTICIPANT IS BUILT SEPARATELY AND THE OTHERS (for now) ARE NOT. Every other
// framework in this suite is compiled by the ONE Vite config in `../../../vite.config.ts`, which
// means they share one toolchain and one Vite version. Angular is the participant that does not
// fit: `@analogjs/vite-plugin-angular` drags `@angular/build` and `@angular/compiler-cli` into
// that shared config, and those bring their own pinned Vite. `bench/build/build-angular.mjs`
// builds THIS file into a single self-contained ES module (`public/bench/angular.js`) with its
// own explicit production settings, and `src/benchmarks/participants/angular/app.ts` loads that
// artifact at
// runtime. Angular's toolchain is then reachable from nowhere the other participants look.
//
// THE IMPORT RULE THAT MAKES THAT WORK: this file may import `todo-spec` and Angular, and
// NOTHING ELSE from this repository. It must never import `todo-app`, which pulls in solid-js,
// react, svelte and marko at module scope — that would put the entire field inside Angular's
// bundle and make the artifact meaningless.
//
// WRITTEN THE WAY ANGULAR DOCUMENTS IT, not the way that would make it fast:
//   • ONE STANDALONE COMPONENT. No NgModule; `standalone` is the default and is not spelled.
//   • SIGNALS for all per-card state (`signal` / `computed` / `update`), which is what the
//     component guide uses and what makes the component's own view mark itself dirty.
//   • BUILT-IN CONTROL FLOW (`@if`, `@for`), so `imports` is empty — `NgIf`/`NgFor` are the
//     old way and would also drag `@angular/common` into the template's dependency list.
//   • ZONELESS. zone.js is not installed at all, and Angular is zoneless by default;
//     `provideZonelessChangeDetection()` is still passed so the choice is written down rather
//     than inherited (`node_modules/@angular/core/types/core.d.ts` is the authority on the
//     name — it has been renamed twice and is no longer `provideExperimental…`).
//   • `changeDetection` IS NOT SET, because `ChangeDetectionStrategy.OnPush` is the default
//     (`ChangeDetectionStrategy.Default` is now spelled `Eager` and is deprecated).
//
// THREE THINGS ABOUT THE MOUNT ARE DELIBERATE, and each one is a place where doing the obvious
// thing would have made the number a lie or the markup wrong.
//
//   1. THE APPLICATION ENVIRONMENT IS BUILT ONCE, OUTSIDE ANY TIMED REGION. `bootstrapApplication`
//      and `createApplication` both return a Promise — Angular is the only participant here whose
//      documented entry point is asynchronous. Awaiting it inside `mountAngularApp` would make the
//      mount asynchronous and unmeasurable by this harness; running it per mount would also charge
//      Angular for building a DI environment that every other participant builds once at module
//      load. So `initAngularApp()` does it once, and `mountAngularApp` is plain synchronous code:
//      `createComponent` + one `detectChanges()`, both of which really do produce the DOM.
//
//   2. THE HOST ELEMENT IS THE BENCH CONTAINER ITSELF, and the `<div class="app">` lives in the
//      template. Angular stamps `ng-version` on whatever element it is given as a root
//      (`createRootTView` in @angular/core: `rootSelectorOrNode ? ['ng-version', VERSION] : …`),
//      and there is no way to turn that off. Putting the host on the container puts that attribute
//      on the container — which is NOT part of `container.innerHTML` and therefore not part of the
//      app's tree at all. It is reported rather than hidden: see the note in
//      `participants/angular/app.ts`.
//
//   3. CHANGE DETECTION IS CALLED BY HAND, `ref.changeDetectorRef.detectChanges()`, and the view
//      is NOT attached to the `ApplicationRef`. Zoneless Angular schedules its own tick on a
//      microtask, which would land OUTSIDE the timed region and make an update look free — the
//      exact hole `flushSync` (react), `flush` (svelte), `tick` (voby) and `run` (marko) are
//      plugged with here. Driving this component's own view keeps the flush synchronous AND keeps
//      it scoped: the harness runs a batch of five mounted apps at once, and `appRef.tick()` would
//      have walked all five on every flip, charging Angular for four apps nobody clicked.
//
// WHAT IS NOT LIKE-FOR-LIKE, stated here because a number cannot state it. Angular's update is
// not the same work as everyone else's. A signal write marks the whole component VIEW dirty;
// one `detectChanges()` then re-evaluates every binding in every dirty view and writes only
// those that changed. Exodra, Solid and Marko route a changed value straight to the one DOM
// position that depends on it and never look at the others. On this app the gap is small,
// because a flip dirties all 80 cards anyway — but Angular still re-checks each card's
// `data-i` and `Task N`, which cannot have changed, and re-walks each tag list with its
// tracking function. That is Angular's model, not a handicap imposed here.
import {
    Component,
    computed,
    createComponent,
    provideZonelessChangeDetection,
    signal,
    type ApplicationRef,
    type Signal,
    type WritableSignal,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import {
    IDX,
    POOL,
    startsOpen,
    startCount,
    nextCount,
    clickAll,
    type AppHandle,
} from '../../../src/benchmarks/shared/todo-spec';

/**
 * ONE CARD'S STATE. `open` and `count` are the two things a card can be asked to change, and
 * `tags` is derived from `count` — the same shape Solid's card has (`const tags = () =>
 * POOL.slice(0, count())`), so the tag array is rebuilt on demand rather than stored twice.
 */
interface AngularCard {
    readonly i: number;
    readonly open: WritableSignal<boolean>;
    readonly count: WritableSignal<number>;
    readonly tags: Signal<readonly string[]>;
}

function makeCard(i: number): AngularCard {
    const count = signal(startCount(i));
    return {
        i,
        open: signal(startsOpen(i)),
        count,
        tags: computed(() => POOL.slice(0, count())),
    };
}

/**
 * THE APP. The template is one string and its markup is the reference app's markup exactly:
 * `<div class="app">` holding 80 `<div class="card" data-i="N">`, each with a heading, a
 * toggle button, a conditional details block, a tag list and an add-tag button.
 *
 * `@if` and `@for` each leave a COMMENT anchor in the DOM where their region sits. So does the
 * reference (`h('#fragment', …)` marks its position the same way), which is why both gates in
 * this suite strip comments before diffing — a marker is a strategy difference, not a markup
 * difference.
 *
 * `track tag` keys the tag list by the tag STRING, which is unique inside `POOL.slice(…)`, so a
 * tag that survives an update survives as the SAME element rather than being rebuilt. The
 * update axis's second gate asserts precisely that, for every participant.
 *
 * `preserveWhitespaces: false` is Angular's default and is written down because this template's
 * bytes have to match another framework's: it is what drops the indentation between elements.
 */
@Component({
    selector: 'bench-angular-todo-app',
    preserveWhitespaces: false,
    template: `
        <div class="app">
            @for (card of cards; track card.i) {
                <div class="card" [attr.data-i]="card.i">
                    <h3>Task {{ card.i }}</h3>
                    <button class="tog" (click)="toggle(card)">details</button>
                    @if (card.open()) {
                        <div class="details">details…</div>
                    }
                    <div class="tags">
                        @for (tag of card.tags(); track tag) {
                            <span class="tag">{{ tag }}</span>
                        }
                    </div>
                    <button class="addtag" (click)="addTag(card)">+</button>
                </div>
            }
        </div>
    `,
})
export class AngularTodoApp {
    // Built when the component is constructed, i.e. INSIDE the timed mount — the same place
    // Solid allocates its per-card signals and Exodra its per-card bindables.
    readonly cards: readonly AngularCard[] = IDX.map(makeCard);

    toggle(card: AngularCard): void {
        card.open.update(open => !open);
    }

    addTag(card: AngularCard): void {
        card.count.update(nextCount);
    }
}

// --- mounting ----------------------------------------------------------------------------
// The one asynchronous step Angular forces, kept in its own call so the mount can stay
// synchronous. Idempotent: the axes call it before their gates, and `verifyAngularApp` calls
// it too, so there is no order in which `mountAngularApp` can be reached uninitialised.
let appRef: ApplicationRef | null = null;
let pending: Promise<ApplicationRef> | null = null;

export async function initAngularApp(): Promise<void> {
    // The PROMISE is cached, not just its result: two callers that reach this before the first
    // one resolves would otherwise build two Angular applications, and the second would leak a
    // DI environment nothing ever destroys.
    pending ??= createApplication({ providers: [provideZonelessChangeDetection()] });
    appRef = await pending;
}

export function mountAngularApp(container: HTMLElement): AppHandle {
    const app = appRef;
    if (app === null) {
        throw new Error(
            'mountAngularApp: `await initAngularApp()` first — Angular builds its application ' +
                'environment asynchronously, and doing it inside the timed region would both ' +
                'make the mount async and charge Angular for setup nobody else pays per mount'
        );
    }
    // `hostElement: container` → `ng-version` lands on the container, not inside it (see the
    // header). Creating the component runs the template's CREATION pass; the first
    // `detectChanges()` runs its UPDATE pass, which is what materialises `@if` and `@for`.
    // Both are inside the timed region, and the DOM is complete when this function returns —
    // which the initial-render axis's element-count gate independently proves.
    const ref = createComponent(AngularTodoApp, {
        environmentInjector: app.injector,
        hostElement: container,
    });
    ref.changeDetectorRef.detectChanges();
    return {
        // The same update round every framework runs, with Angular's synchronous flush at the
        // end — the counterpart of react's `flushSync` and marko's `run`.
        flip: () => {
            clickAll(container, '.tog');
            clickAll(container, '.addtag');
            ref.changeDetectorRef.detectChanges();
        },
        teardown: () => ref.destroy(),
    };
}
