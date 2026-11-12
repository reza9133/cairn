import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PayoutCalculator, ScheduleCalculator } from "../components/Calculators";
import Icon from "../components/Icon";
import Mochi from "../components/Mochi";
import { LinkButton } from "../components/ui";
import { GITHUB_URL } from "../config";
import { DOCS, GROUPS, type DocPage } from "../docs";
import { plainText, renderMarkdown } from "../lib/markdown";

function Sidebar({ current, q, setQ, onPick }: { current?: string; q: string; setQ: (s: string) => void; onPick?: () => void }) {
  const index = useMemo(() => DOCS.map((d) => ({ d, text: `${d.title} ${d.summary} ${d.body ? plainText(d.body) : ""}`.toLowerCase() })), []);
  const hits = q.trim() ? index.filter((x) => x.text.includes(q.trim().toLowerCase())).map((x) => x.d) : null;
  return (
    <nav className="docnav" aria-label="Documentation">
      <label className="search search--sm">
        <Icon name="search" size={15} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the docs" aria-label="Search the docs" />
      </label>
      {hits ? (
        <div className="docnav__group">
          <h4>{hits.length} result{hits.length === 1 ? "" : "s"}</h4>
          {hits.map((d) => <Link key={d.slug} to={`/docs/${d.slug}`} className={d.slug === current ? "is-active" : ""} onClick={onPick}>{d.title}</Link>)}
        </div>
      ) : GROUPS.map((g) => (
        <div className="docnav__group" key={g}>
          <h4>{g}</h4>
          {DOCS.filter((d) => d.group === g).map((d) => <Link key={d.slug} to={`/docs/${d.slug}`} className={d.slug === current ? "is-active" : ""} onClick={onPick}><Icon name={d.icon} size={15} />{d.title}</Link>)}
        </div>
      ))}
    </nav>
  );
}

function DocsHome() {
  return (
    <div className="docshome">
      <div className="docshome__hero">
        <div>
          <span className="eyebrow">Documentation</span>
          <h1>Everything about Cairn, in plain words</h1>
          <p className="muted">From the idea in one minute to every method of the contract. Pick a page, or start with the introduction.</p>
          <div className="row"><LinkButton to="/docs/introduction" icon="book">Start here</LinkButton><LinkButton to="/docs/quickstart" variant="soft" icon="zap">Quickstart</LinkButton><LinkButton to={GITHUB_URL} external variant="ghost" icon="github">Source</LinkButton></div>
        </div>
        <Mochi size={190} />
      </div>
      {GROUPS.map((g) => (
        <section key={g}>
          <h2 className="docshome__group">{g}</h2>
          <div className="grid grid--3">
            {DOCS.filter((d) => d.group === g).map((d) => (
              <Link key={d.slug} to={`/docs/${d.slug}`} className="card tilt doccard">
                <Icon name={d.icon} size={22} />
                <h3>{d.title}</h3>
                <p>{d.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Article({ page }: { page: DocPage }) {
  const nav = useNavigate();
  const rendered = useMemo(() => (page.body ? renderMarkdown(page.body) : { html: "", toc: [] }), [page]);
  const [active, setActive] = useState<string>("");
  const ref = useRef<HTMLDivElement>(null);
  const idx = DOCS.findIndex((d) => d.slug === page.slug);
  const prev = DOCS[idx - 1], next = DOCS[idx + 1];

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const heads = Array.from(root.querySelectorAll<HTMLElement>("h2[id], h3[id]"));
    if (!heads.length) return;
    const io = new IntersectionObserver((es) => {
      const vis = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActive(vis.target.id);
    }, { rootMargin: "-90px 0px -70% 0px" });
    heads.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [rendered]);

  const onClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    const copy = t.closest<HTMLElement>("[data-copy]");
    if (copy) {
      const code = copy.closest(".codeblock")?.querySelector("code")?.textContent ?? "";
      navigator.clipboard?.writeText(code).then(() => { copy.textContent = "Copied"; setTimeout(() => (copy.textContent = "Copy"), 1200); });
      return;
    }
    const anchor = t.closest<HTMLElement>("[data-anchor]");
    if (anchor) { e.preventDefault(); document.getElementById(anchor.dataset.anchor!)?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    const route = t.closest<HTMLAnchorElement>("a[data-route]");
    if (route) { e.preventDefault(); nav(route.dataset.route!); }
  };

  return (
    <article className="doc">
      <header className="doc__head">
        <span className="eyebrow">{page.group}</span>
        <h1>{page.title}</h1>
        <p className="muted">{page.summary}</p>
      </header>
      <div className="docbody-wrap">
        <div className="docbody" ref={ref} onClick={onClick}>
          {page.custom === "calculator" ? (
            <>
              <p>These calculators run in your browser and use the same arithmetic as the contract. Nothing is sent anywhere.</p>
              <PayoutCalculator />
              <ScheduleCalculator />
            </>
          ) : <div dangerouslySetInnerHTML={{ __html: rendered.html }} />}
        </div>
        {rendered.toc.length > 1 && (
          <aside className="toc" aria-label="On this page">
            <h4>On this page</h4>
            {rendered.toc.map((t) => (
              <button key={t.id} className={`toc__item toc__item--${t.depth} ${active === t.id ? "is-active" : ""}`} onClick={() => document.getElementById(t.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{t.text}</button>
            ))}
          </aside>
        )}
      </div>
      <nav className="pager" aria-label="Previous and next page">
        {prev ? <Link to={`/docs/${prev.slug}`} className="pager__a"><small>Previous</small><b>{prev.title}</b></Link> : <span />}
        {next ? <Link to={`/docs/${next.slug}`} className="pager__a pager__a--next"><small>Next</small><b>{next.title}</b></Link> : <span />}
      </nav>
      <p className="muted small">Found a mistake? <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer">Open an issue on GitHub</a>.</p>
    </article>
  );
}

export default function Docs() {
  const { slug } = useParams();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);
  const page = DOCS.find((d) => d.slug === slug);
  useEffect(() => { window.scrollTo({ top: 0 }); setMenu(false); }, [slug]);
  const missing = slug && !page;

  return (
    <div className="page page--docs">
      <button className="btn btn--soft btn--sm docs__menubtn" onClick={() => setMenu((m) => !m)}><Icon name={menu ? "close" : "list"} size={16} /><span>{menu ? "Close" : "Docs menu"}</span></button>
      <div className="docs">
        <div className={`docs__side ${menu ? "is-open" : ""}`}><Sidebar current={slug} q={q} setQ={setQ} onPick={() => setMenu(false)} /></div>
        <div className="docs__main">
          {!slug && <DocsHome />}
          {page && <Article key={page.slug} page={page} />}
          {missing && <div className="card card--center"><h3>There is no such page</h3><LinkButton to="/docs" icon="book">All documentation</LinkButton></div>}
        </div>
      </div>
    </div>
  );
}
