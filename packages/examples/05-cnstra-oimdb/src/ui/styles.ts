// Inlined into the SSR document head so first paint is styled (no FOUC).
export const appStyles = `
*{box-sizing:border-box}
body{margin:0;font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b1120;color:#e2e8f0}
input,select,textarea,button{font:inherit;color:inherit}
button{cursor:pointer}
a{color:inherit;text-decoration:none}

/* layout */
.app{display:grid;grid-template-columns:220px 1fr;min-height:100vh}
.sidebar{background:#0f172a;border-right:1px solid #1e293b;display:flex;flex-direction:column;padding:18px 12px;position:sticky;top:0;height:100vh}
.brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:16px;padding:6px 10px 16px}
.brand__dot{width:12px;height:12px;border-radius:4px;background:linear-gradient(135deg,#6366f1,#22d3ee)}
.brand__sub{color:#64748b;font-weight:500}
.nav{display:flex;flex-direction:column;gap:2px;flex:1}
.nav__link{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;color:#94a3b8}
.nav__link:hover{background:#1e293b;color:#e2e8f0}
.nav__link--active{background:#1e293b;color:#fff;box-shadow:inset 2px 0 0 #6366f1}
.nav__icon{width:18px;text-align:center;opacity:.9}
.sidebar__foot{color:#475569;font-size:11px;line-height:1.6;padding:10px}
.content{display:flex;flex-direction:column;min-width:0}
.topbar{display:flex;align-items:baseline;gap:14px;padding:14px 22px;border-bottom:1px solid #1e293b;background:#0f172a}
.topbar__stat{font-weight:600}
.topbar__hint{color:#64748b;font-size:12px}
.error{margin:0;padding:0 22px;color:#f87171;min-height:0}
.error:not(:empty){padding:10px 22px}
.outlet{padding:22px;flex:1}
.outlet[data-loading]{opacity:.5}

/* page chrome */
.page__bar{display:flex;align-items:center;gap:14px;margin-bottom:18px;flex-wrap:wrap}
.page__title{margin:0;font-size:20px}
.page__hint{color:#64748b;font-size:12px}
.page__spacer{flex:1}
.muted{color:#64748b}
.field{display:flex;align-items:center;gap:6px;color:#94a3b8;font-size:13px}

/* controls */
input,select,textarea{background:#0f172a;border:1px solid #334155;border-radius:8px;padding:7px 9px}
input:focus,select:focus,textarea:focus{outline:none;border-color:#6366f1}
.add__input{min-width:180px}
.btn{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:7px 12px}
.btn:hover{border-color:#475569}
.btn--primary{background:#6366f1;border-color:#6366f1;color:#fff}
.btn--primary:hover{background:#4f46e5}
.btn--danger{background:#3f1d2b;border-color:#7f1d1d;color:#fca5a5}

/* board */
.board{display:flex;gap:14px;overflow-x:auto;padding-bottom:8px}
.col{flex:0 0 260px;background:#0f172a;border:1px solid #1e293b;border-radius:12px;display:flex;flex-direction:column}
.col__head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:2px solid var(--c,#334155);font-weight:600}
.col__count{color:#64748b;font-size:12px}
.col__body{padding:10px;display:flex;flex-direction:column;gap:8px;min-height:40px}
.card{background:#111c33;border:1px solid #1e293b;border-left:3px solid #475569;border-radius:9px;padding:9px 10px;display:flex;flex-direction:column;gap:6px}
.card--urgent{border-left-color:#ef4444}
.card--high{border-left-color:#f59e0b}
.card--medium{border-left-color:#3b82f6}
.card--low{border-left-color:#64748b}
.card--pending{opacity:.55;font-style:italic}
.card__top{display:flex;align-items:center;gap:7px}
.card__prio{opacity:.8}
.card__title{flex:1;font-weight:500}
.card__del,.card__btn{background:none;border:none;color:#64748b;padding:2px 5px;border-radius:6px}
.card__del:hover{color:#f87171;background:#1e293b}
.card__btn:hover{color:#e2e8f0;background:#1e293b}
.card__meta{color:#64748b;font-size:12px}
.card__foot{display:flex;align-items:center;justify-content:space-between}
.card__assignee{color:#94a3b8;font-size:12px}

/* panels grid (people, taxonomy) */
.panels{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.panel{background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:14px}
.panel__title{margin:0 0 10px;font-size:15px;display:flex;align-items:center;gap:8px}
.panel__dot{width:10px;height:10px;border-radius:3px}
.panel__add{display:flex;gap:8px;margin-top:10px}
.swatches,.members,.ms-list,.ms,.cmts,.feed,.tasklist,.cmts{list-style:none;margin:0;padding:0}
.swatch,.member{display:flex;align-items:center;gap:8px;padding:5px 0}
.swatch__dot{width:14px;height:14px;border-radius:4px;flex:0 0 auto}
.swatch__name,.member__name{flex:1}
.swatch__color{width:38px;padding:2px}
.member__role{width:90px}
.swatch__del,.member__del{background:none;border:none;color:#64748b}
.swatch__del:hover,.member__del:hover{color:#f87171}

/* projects */
.projgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.projcard{background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px}
.projcard--archived{opacity:.45}
.projcard__head{display:flex;align-items:center;gap:8px;border-bottom:2px solid var(--c,#334155);padding-bottom:8px}
.projcard__name{flex:1;font-weight:600;background:none;border:none;padding:2px}
.projcard__count{color:#64748b;font-size:12px}
.projcard__desc{width:100%;min-height:44px;resize:vertical}
.projcard__lead{color:#94a3b8;font-size:12px}
.ms{display:flex;gap:8px;align-items:center;padding:3px 0}
.ms__title{flex:1;background:none;border:none;border-bottom:1px solid #1e293b;border-radius:0}
.ms__done{font-size:12px;padding:3px 8px}
.projcard__foot{margin-top:6px}

/* tasks table */
.tasklist{display:flex;flex-direction:column;gap:8px}
.trow{background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:8px 10px}
.trow--pending{opacity:.6}
.trow__main{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.trow__title{flex:1;min-width:160px;font-weight:500}
.trow__status,.trow__assignee,.trow__prio,.trow__label{min-width:110px}
.trow__tags{width:140px}
.trow__del{background:none;border:none;color:#64748b}
.trow__del:hover{color:#f87171}
.trow__comments{margin-top:8px;font-size:13px;color:#94a3b8}
.trow__comments summary{cursor:pointer;color:#64748b}
.cmt{display:flex;gap:8px;padding:3px 0}
.cmt__author{color:#a5b4fc}
.cmt-add{margin-top:6px}

/* activity feed */
.feed{display:flex;flex-direction:column;gap:6px;max-width:680px}
.feed__item{display:flex;align-items:center;gap:10px;background:#0f172a;border:1px solid #1e293b;border-radius:9px;padding:9px 12px}
.feed__icon{width:20px;text-align:center}
.feed__summary{flex:1}
.feed__kind{color:#475569;font-size:11px;font-family:ui-monospace,monospace}

/* virtual list */
.vlist{overflow-y:auto;border:1px solid #1e293b;border-radius:10px;background:#0f172a;max-width:820px;position:relative}
.vlist__spacer{position:relative;width:100%}
.vrow{position:absolute;left:0;right:0;height:36px;display:flex;align-items:center;gap:12px;padding:0 14px;border-bottom:1px solid #16233b;font-size:13px}
.vrow:hover{background:#16233b}
.vrow__idx{width:64px;color:#475569;font-family:ui-monospace,monospace}
.vrow__title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vrow__cat{font-size:11px;padding:2px 7px;border-radius:6px;font-family:ui-monospace,monospace}
.cat--bug{background:#3f1d2b;color:#fca5a5}
.cat--feature{background:#1e2f4d;color:#93c5fd}
.cat--chore{background:#2a2440;color:#c4b5fd}
.cat--docs{background:#153043;color:#7dd3fc}
.cat--test{background:#1e3a2e;color:#86efac}
.vrow__val{width:52px;text-align:right;color:#94a3b8;font-family:ui-monospace,monospace}
.vrow__star{background:none;border:none;color:#334155;font-size:15px;line-height:1;padding:2px 4px}
.vrow__star.is-on{color:#fbbf24}
.vp-readout{font-family:ui-monospace,monospace;font-size:12px;color:#7dd3fc;background:#0f223a;border:1px solid #1e3a5f;border-radius:7px;padding:3px 9px}
`;
