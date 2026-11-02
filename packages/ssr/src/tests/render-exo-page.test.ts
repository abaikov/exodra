// @vitest-environment jsdom
//
// SSR ON THE SCHEMA CORE — the document, the response, and the two ends of the state protocol.
//
// WHAT IS ACTUALLY AT RISK HERE, and it is not the string concatenation. Three agreements have
// to hold, and each of them fails SILENTLY when it does not:
//
//  1. THE CONTAINER. `renderDocument` emits `<div id="app">` around the instance and
//     `ExoDomBackend.hydrate` is handed a parent whose element CHILD is that instance. Hand it the
//     container's first child instead and hydration adopts one level too deep: every port lands
//     on the wrong node, no exception is thrown, and the page looks right until something
//     updates. `findExoRowDisagreement` is used below to state which node is which, in words.
//  2. THE STATE PROTOCOL. Whatever `renderStateScript` writes has to be readable by
//     `readExoStateScript`.
//  3. THE REQUEST'S LIFETIME. `EXO_SSR_RESPONSE` is a context provided around one render. A render that
//     leaves the frame standing hands the NEXT request a response object belonging to a user who
//     has already been served.
import { exoContextToken, exoContextFrame } from '@exodra/context';
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoWire,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import type {
    TExoMachineNode,
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoEventPort,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import type { TExoContextToken } from '@exodra/context';
import { findExoRowDisagreement } from '@exodra/dom';
import type { TExoStrMachine, TExoStrNode } from '@exodra/string';
import { beforeEach, describe, expect, it } from 'vitest';
import { EXO_SSR_RESPONSE } from '../constants/EXO_SSR_RESPONSE';
import { readExoStateScript } from '../scripts/readExoStateScript';
import { renderExoPage } from '../page/renderExoPage';
import type { TExoSsrResponse } from '../types/TExoSsrResponse';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';
import { createExoTestMachine, source } from '@exodra/test-utils';

// THE CLIENT BACKEND, COMPOSED WITH `withExoHydration()` because adoption is a composed capability: a
// backend without that plugin has no `hydrate` at all, so a client-rendered page never pulls the
// adopters into its bundle. Built ONCE — the backend is the schema cache key and it is compared
// by pointer, so one per case would recompile every schema per case.
const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

/**
 * WHAT THESE WIRES ASSUME OF A CONNECTOR — methods only, so the server's connector and
 * hydration's both satisfy it and ONE wiring function drives both sides. There is no cast at any
 * entry point below, which is the point: the component served is the component adopted.
 */
type TWiring = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    on(port: TExoEventPort, handler: (...args: unknown[]) => unknown, subject?: unknown): void;
    onTeardown(off: () => void): void;
    inject<TValue>(key: TExoContextToken<TValue>): TValue | undefined;
};

/** Nothing may leak between cases: `readExoStateScript` and `#app` are both found BY ID. */
beforeEach(() => {
    document.body.innerHTML = '';
});

/** The page's shape, shared by every case: a heading, a button, and a `data-` attribute. */
const buildPage = (b: TExoSchemaCursor) => {
    let title!: TExoTextPort;
    let count!: TExoAttrPort;
    let click!: TExoEventPort;
    b.el('main', { class: 'page' }, (main) => {
        main.el('h1', null, (h1) => {
            title = h1.textPort();
        });
        main.el('button', null, (button) => {
            count = button.port('data-count');
            click = button.eventPort('click');
        });
    });
    return { title, count, click };
};

type TPagePorts = ReturnType<typeof buildPage>;

/** One shape; each case supplies the wiring that case is about. */
const pageWith = (make: (ports: TPagePorts) => TExoMachineInitialState<TWiring>) =>
    createExoTestMachine(buildPage, make);

/** Fill the shape and do nothing else — the baseline every response case starts from. */
const fill =
    (ports: TPagePorts): TExoMachineInitialState<TWiring> =>
    (c) => {
        c.text(ports.title, 'Page');
        c.attr(ports.count, 0);
        c.on(ports.click, () => undefined);
    };

/** Fill the shape AND say something about the response. */
const pageSaying = (say: (ssr: TExoSsrResponse) => void) =>
    pageWith((P) => {
        const base = fill(P);
        return (c, params) => {
            const ssr = c.inject(EXO_SSR_RESPONSE);
            if (ssr !== undefined) say(ssr);
            base(c, params);
        };
    });

describe('renderExoPage — the document', () => {
    it('emits a document with the head entries a wire added, after the seeded ones', () => {
        const PAGE = pageSaying((ssr) => {
            ssr.addHead('<title>Home</title>');
            ssr.addHead(['<meta name="robots" content="all">', '<link rel="icon" href="/i">']);
        });

        const page = renderExoPage(PAGE, { head: '<meta charset="utf-8">' });
        const doc = page.renderDocument();

        // The seeded entry is FIRST — a charset that arrives after a title is a charset the
        // parser has already had to guess at.
        expect(page.head).toBe(
            '<meta charset="utf-8">' +
                '<title>Home</title>' +
                '<meta name="robots" content="all">' +
                '<link rel="icon" href="/i">'
        );
        expect(doc.startsWith('<!doctype html>\n<html lang="en"><head>')).toBe(true);
        expect(doc).toContain('<head>' + page.head + '</head>');
        expect(doc.endsWith('</body></html>')).toBe(true);
    });

    it('puts the rendered page inside the container, and nothing else', () => {
        // The byte form of agreement #1. Everything else about hydration follows from this line
        // being exactly this line.
        //
        // A PAGE IS ONE INSTANCE. There is no count on either side any more — a root is a root,
        // and a page that shows many of something shows a LIST inside it, which is a children port
        // and not a repeated root. So the claim here is byte equality with what the server backend
        // renders on its own: `renderExoPage` adds the document around it and nothing to it.
        // Rendered THROUGH this file's server backend (`options.backend`) so that both sides of the
        // comparison are the same compiled schema and the equality is about the bytes, not about
        // two schemas happening to agree.
        const PAGE = pageWith(fill);
        const page = renderExoPage(PAGE, { backend: EXO_STR });
        expect(page.renderDocument()).toContain('<div id="app">' + page.html + '</div>');
        expect(page.html).toBe(EXO_STR.render(PAGE));
    });

    it("hands params to the page machine's wire", () => {
        const schema = createExoSchema(buildPage);
        const P = schema.ports;
        const Page = withExoWire(
            createExoMachine<TWiring & TExoMachineNode, { title: string }>(schema),
            (c, params) => {
                c.text(P.title, params.title);
                c.attr(P.count, 0);
                c.on(P.click, () => undefined);
            }
        );
        const page = renderExoPage(Page, { params: { title: 'From the request' } });
        expect(page.html).toContain('From the request');
    });

    it('keeps the state script OUTSIDE the container', () => {
        // If it were inside, it would be a node a hydration walks past — and `hydrate` takes the
        // container's first ELEMENT child, so a `<script>` before the instance would be adopted
        // as the instance.
        const PAGE = pageSaying((ssr) => ssr.setState('user', 'ada'));
        const page = renderExoPage(PAGE);
        const doc = page.renderDocument();
        expect(doc).toContain('</div>' + page.stateScript + '</body>');
        expect(doc.indexOf('__EXODRA_STATE__')).toBeGreaterThan(doc.indexOf('</div>'));
    });

    it('honours doctype:false, lang, rootId, html/body attributes and a nonce', () => {
        const PAGE = pageSaying((ssr) => ssr.setState('k', 1));
        const doc = renderExoPage(PAGE).renderDocument({
            doctype: false,
            lang: 'ru',
            rootId: 'root',
            nonce: 'n0nce',
            htmlAttributes: { 'data-theme': 'dark' },
            bodyAttributes: { class: 'ssr' },
        });
        expect(doc.startsWith('<html lang="ru" data-theme="dark">')).toBe(true);
        expect(doc).toContain('<body class="ssr">');
        expect(doc).toContain('<div id="root">');
        expect(doc).toContain('nonce="n0nce"');
    });
});

describe('renderExoPage — the response', () => {
    it('carries the status a wire set', () => {
        const PAGE = pageSaying((ssr) => ssr.setStatus(404));
        expect(renderExoPage(PAGE).status).toBe(404);
    });

    it('defaults to 200 with empty collections when a page says nothing', () => {
        const page = renderExoPage(pageWith(fill));
        expect(page.status).toBe(200);
        expect(page.headers).toEqual([]);
        expect(page.head).toBe('');
        expect(page.state).toEqual({});
        expect(page.stateScript).toBe('');
    });

    it('overrides with setHeader (case-insensitively) and accumulates with appendHeader', () => {
        // The two are different METHODS here, where the component form made it a boolean prop.
        const PAGE = pageSaying((ssr) => {
            ssr.setHeader('Content-Type', 'text/plain');
            ssr.setHeader('content-type', 'text/html; charset=utf-8');
            ssr.appendHeader('Set-Cookie', 'a=1');
            ssr.appendHeader('Set-Cookie', 'b=2');
        });
        expect(renderExoPage(PAGE).headers).toEqual([
            { name: 'content-type', value: 'text/html; charset=utf-8' },
            { name: 'Set-Cookie', value: 'a=1' },
            { name: 'Set-Cookie', value: 'b=2' },
        ]);
    });

    it('seeds status, headers and state from the options a server already knows', () => {
        const page = renderExoPage(pageWith(fill), {
            status: 201,
            headers: [{ name: 'X-Init', value: 'y' }],
            state: new Map<string, unknown>([['b', 2]]),
        });
        expect(page.status).toBe(201);
        expect(page.headers).toEqual([{ name: 'X-Init', value: 'y' }]);
        expect(page.state).toEqual({ b: 2 });
    });
});

describe('renderExoPage — the request is one render long', () => {
    it('reaches every row of a list, and every wire sees the SAME object', () => {
        // A REQUEST IS ONE RENDER OF ONE ROOT — no entry point takes a count any more — so "every
        // instance" is every wire the render reaches, which for a page means the rows of a list
        // inside it. That is the harder version of the same claim: a row is a DIFFERENT schema with
        // its own connector stack, so a frame installed per schema instead of per request would
        // give each row a response of its own and this case would see three objects.
        const seen: (TExoSsrResponse | undefined)[] = [];
        const ROW = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let text!: TExoTextPort;
                b.el('li', null, (li) => {
                    text = li.textPort();
                });
                return { text };
            },
            (P): TExoMachineInitialState<TWiring> =>
                (c, params) => {
                    const at = params as number;
                    const ssr = c.inject(EXO_SSR_RESPONSE);
                    seen.push(ssr);
                    if (ssr !== undefined) ssr.setState('row' + at, at);
                    c.text(P.text, 'row ' + at);
                }
        );
        // A row reads its own data from the params it is handed, and this list's rows have nothing
        // to read but a number.
        const LIST: TExoStrMachine = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let kids!: TExoChildrenPort;
                b.el('ul', null, (ul) => {
                    kids = ul.childrenPort();
                });
                return { kids };
            },
            (P): TExoMachineInitialState<TExoStrNode> =>
                (c) => {
                    c.list(P.kids, ROW, [0, 1, 2]);
                }
        );

        const page = renderExoPage(LIST);
        expect(seen.length).toBe(3);
        expect(seen[1]).toBe(seen[0]);
        expect(seen[2]).toBe(seen[0]);
        expect(page.state).toEqual({ row0: 0, row1: 1, row2: 2 });
    });

    it('leaves nothing behind for the next request to inject', () => {
        // A response left standing is the next request injecting a dead one — a page with
        // somebody else's headers, and no error anywhere. The frame is a PARAMETER now, so the
        // second render can only see a response if it was handed one: rendering with no request
        // at all is what proves nothing survived the first.
        renderExoPage(pageSaying((ssr) => ssr.setStatus(418)));
        const seen: (TExoSsrResponse | undefined)[] = [];
        const AFTER = pageWith((P) => {
            const base = fill(P);
            return (c, params) => {
                seen.push(c.inject(EXO_SSR_RESPONSE));
                base(c, params);
            };
        });
        EXO_STR.render(AFTER);
        expect(seen).toEqual([undefined]);
    });

    it('leaves nothing behind even when the wire throws', () => {
        const BOOM = pageWith(() => () => {
            throw new Error('wire failed');
        });
        expect(() => renderExoPage(BOOM)).toThrow('wire failed');
        const seen: (TExoSsrResponse | undefined)[] = [];
        const AFTER = pageWith((P) => {
            const base = fill(P);
            return (c, params) => {
                seen.push(c.inject(EXO_SSR_RESPONSE));
                base(c, params);
            };
        });
        EXO_STR.render(AFTER);
        expect(seen).toEqual([undefined]);
    });

    it('two renders at once do not see each other, which a module holder could not promise', () => {
        // THE DEFECT THE PARAMETER REMOVES. While the frame lived in a module holder, an inner
        // render overwrote the outer one's and the restore put back a frame the outer render had
        // already passed. Here the inner render happens INSIDE the outer one's wire.
        const OUTER = exoContextToken<string>('outer');
        const INNER = exoContextToken<string>('inner');
        const seenOuter: (string | undefined)[] = [];
        const seenInner: (string | undefined)[] = [];

        const INNER_PAGE = pageWith((P) => {
            const base = fill(P);
            return (c, params) => {
                seenInner.push(c.inject(INNER));
                base(c, params);
            };
        });

        const OUTER_PAGE = pageWith((P) => {
            const base = fill(P);
            return (c, params) => {
                renderExoPage(INNER_PAGE, { context: exoContextFrame(null, INNER, 'inner') });
                // READ AFTER the nested render returns: this is the line a holder got wrong.
                seenOuter.push(c.inject(OUTER));
                base(c, params);
            };
        });

        renderExoPage(OUTER_PAGE, { context: exoContextFrame(null, OUTER, 'outer') });
        expect(seenInner).toEqual(['inner']);
        expect(seenOuter).toEqual(['outer']);
    });

    it('is undefined outside renderExoPage, rather than a silent no-op', () => {
        // The same component, rendered by `@exodra/string` directly. Nothing global was
        // installed, so a page rendered without a request says so.
        const seen: (TExoSsrResponse | undefined)[] = [];
        const PAGE = pageWith((P) => {
            const base = fill(P);
            return (c, params) => {
                seen.push(c.inject(EXO_SSR_RESPONSE));
                base(c, params);
            };
        });
        EXO_STR.render(PAGE);
        expect(seen).toEqual([undefined]);
    });

    it('does not shadow a context the caller had already provided', () => {
        // `renderExoPage` pushes ONE frame in front of the frame it was HANDED, exactly as
        // a wire's own `provide` does — so a framework that provided a router or a data layer
        // around the render still reaches the page.
        const ROUTER = exoContextToken<string>('router');
        const seen: (string | undefined)[] = [];
        const PAGE = pageWith((P) => {
            const base = fill(P);
            return (c, params) => {
                seen.push(c.inject(ROUTER));
                expect(c.inject(EXO_SSR_RESPONSE)).not.toBe(undefined);
                base(c, params);
            };
        });

        renderExoPage(PAGE, { context: exoContextFrame(null, ROUTER, '/home') });
        expect(seen).toEqual(['/home']);
    });
});

describe('the state protocol', () => {
    /** Put a rendered state script into the live document and read it back the way a page would. */
    const put = (stateScript: string): void => {
        const holder = document.createElement('div');
        holder.innerHTML = stateScript;
        document.body.appendChild(holder.firstElementChild as Element);
    };

    it('round-trips through readExoStateScript', () => {
        const PAGE = pageSaying((ssr) => {
            ssr.setState('user', { id: 7, name: 'Ada' });
            ssr.setState('flags', ['a', 'b']);
        });
        const page = renderExoPage(PAGE);
        put(page.stateScript);
        expect(readExoStateScript()).toEqual({
            user: { id: 7, name: 'Ada' },
            flags: ['a', 'b'],
        });
    });

    it('round-trips values that would otherwise end the script element', () => {
        // The payload the escaping exists for. It has to survive as DATA — identical in, out —
        // while never appearing as markup in between.
        const evil = '</script><img src=x onerror=alert(1)>&<>\u2028\u2029';
        const PAGE = pageSaying((ssr) => ssr.setState('evil', evil));
        const page = renderExoPage(PAGE);

        // Exactly one literal `</script>` in the whole script: its own closing tag.
        expect(page.stateScript.match(/<\/script>/g)?.length).toBe(1);
        expect(page.stateScript).toContain('\\u003C/script\\u003E');
        expect(page.stateScript).not.toContain('<img');

        put(page.stateScript);
        expect(readExoStateScript()).toEqual({ evil });
        // And no element was smuggled into the document by putting it there.
        expect(document.querySelector('img')).toBe(null);
    });

    it('is undefined when the page transferred nothing', () => {
        const page = renderExoPage(pageWith(fill));
        expect(page.stateScript).toBe('');
        expect(readExoStateScript()).toBe(undefined);
    });
});

describe('the container a hydration is handed', () => {
    /** Parse the server's document the way a browser does, and move the container into this one. */
    const load = (html: string): Element => {
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        const container = parsed.getElementById('app') as Element;
        // ADOPTED, not cloned: the nodes hydration touches are the nodes the parser produced.
        document.body.appendChild(document.adoptNode(container));
        return container;
    };

    it('is the container itself — adopted without a single node being touched', () => {
        // Watched with a MutationObserver rather than compared as markup: a hydration that
        // rebuilt the page and happened to produce identical bytes would pass a string compare
        // and fail this.
        const PAGE = pageWith(fill);
        const container = load(renderExoPage(PAGE).renderDocument());
        const before = container.innerHTML;
        const original = Array.from(container.children);

        let mutations = 0;
        const observer = new MutationObserver((records) => {
            mutations += records.length;
        });
        observer.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
        });
        const dispose = EXO_BACKEND.hydrate(PAGE, container);
        mutations += observer.takeRecords().length;
        observer.disconnect();

        expect(mutations).toBe(0);
        expect(container.innerHTML).toBe(before);
        expect(Array.from(container.children)).toEqual(original);
        dispose();
    });

    it('makes the listeners the server could not print work', () => {
        // The one thing hydration must actually DO, done against a document that came out of
        // `renderDocument` rather than out of a bare `ExoDomBackend.render`. The server prints no
        // listener at all — an event port's writer on that backend writes nothing — so a button
        // that answers a click here answers it because adoption attached one.
        let clicked = -1;
        const PAGE = pageWith((P) => (c, params) => {
            const n = params as number;
            c.text(P.title, 'Page ' + n);
            c.attr(P.count, n);
            c.on(P.click, () => {
                clicked = n;
            });
        });
        const container = load(renderExoPage(PAGE, { params: 7 }).renderDocument());
        EXO_BACKEND.hydrate(PAGE, container, 7);

        const button = container.querySelector('button') as Element;
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        // `7` is the params the instance was built with, and `-1` is what the initialiser holds:
        // the assertion is that the handler RAN, and that it ran with its own params.
        expect(clicked).toBe(7);
    });

    it('and NOT its first child — which is the failure this whole test exists for', () => {
        // `hydrate` walks `parent.firstElementChild`, so the parent must be the element whose
        // CHILD is the instance. Nothing in the hydration path checks that: it trusts the markup
        // by design, which is what makes it cheaper than rendering and what makes this mistake
        // silent. `findExoRowDisagreement` is the diagnostic that says which node is which — asked under
        // THE BACKEND THE HYDRATION USES, because that is what selects the schema it compares to.
        const PAGE = pageWith(fill);
        const container = load(renderExoPage(PAGE).renderDocument());
        const instanceRoot = container.firstElementChild as Element;

        // The container's first element child IS an instance of the schema...
        expect(findExoRowDisagreement(PAGE, instanceRoot, EXO_BACKEND)).toBe(null);
        // ...and ITS first element child is not, which is precisely what hydration would have
        // adopted had the container's first child been passed as the parent. Hydration itself
        // would have said nothing about it.
        expect(
            findExoRowDisagreement(PAGE, instanceRoot.firstElementChild as Element, EXO_BACKEND)
        ).not.toBe(null);
    });

    it('keeps a followed value live after adoption, and repairs one the server got wrong', () => {
        // The end-to-end shape of an SSR page: the server printed what the source held when the
        // request was served, the client computes something else by the time the bundle lands,
        // and the subscription still has to be there afterwards.
        const title = source('from the server');
        const schema = createExoSchema(buildPage);
        const P = schema.ports;
        const m = createExoMachine<TWiring & TExoMachineNode>(schema);
        const PAGE = composeExoMachine(
            m,
            (m) =>
                withExoTransitions(m, {
                    show: (c) => c.text(P.title, title.getValue()),
                }),
            (m) =>
                withExoWire(m, (c) => {
                    c.attr(P.count, 0);
                    c.on(P.click, () => undefined);
                }),
            (m) =>
                withExoEffects(m, (effect) => {
                    effect((c) => {
                        show(c);
                        return title.onChange(() => show(c));
                    });
                })
        );
        const { show } = PAGE.transitions;

        const container = load(renderExoPage(PAGE).renderDocument());
        expect(container.querySelector('h1')?.textContent).toBe('from the server');
        expect(title.subscribers()).toBe(0);

        title.setValue('different on the client');
        EXO_BACKEND.hydrate(PAGE, container);
        expect(container.querySelector('h1')?.textContent).toBe('different on the client');

        title.setValue('and again');
        expect(container.querySelector('h1')?.textContent).toBe('and again');
    });
});
