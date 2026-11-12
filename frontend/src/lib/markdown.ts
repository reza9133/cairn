import { Marked } from "marked";
import { highlight } from "./highlight";

export interface TocItem { id: string; text: string; depth: number }

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const slugify = (s: string) => s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "section";

const CALLOUTS: Record<string, string> = { NOTE: "Note", TIP: "Tip", WARNING: "Careful", DANGER: "Danger" };

export function renderMarkdown(src: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Map<string, number>();
  const md = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }) {
        const inline = this.parser.parseInline(tokens);
        const text = inline.replace(/<[^>]+>/g, "");
        let id = slugify(text);
        const n = used.get(id) ?? 0;
        used.set(id, n + 1);
        if (n) id = `${id}-${n + 1}`;
        if (depth === 2 || depth === 3) toc.push({ id, text, depth });
        return `<h${depth} id="${id}"><a class="anchor" data-anchor="${id}" aria-label="Link to this section">#</a>${inline}</h${depth}>`;
      },
      code({ text, lang }) {
        const l = (lang ?? "").trim().split(/\s+/)[0].toLowerCase();
        const label = l === "" ? "text" : l;
        return `<div class="codeblock"><div class="codeblock__bar"><span>${escapeHtml(label)}</span><button type="button" data-copy aria-label="Copy code">Copy</button></div><pre><code>${highlight(text, l)}</code></pre></div>`;
      },
      blockquote({ tokens }) {
        const inner = this.parser.parse(tokens);
        const m = /^\s*<p>\[!(NOTE|TIP|WARNING|DANGER)\]\s*(?:<br\s*\/?>)?\s*/i.exec(inner);
        if (m) {
          const type = m[1].toUpperCase();
          return `<div class="callout callout--${type.toLowerCase()}"><strong>${CALLOUTS[type]}</strong><div>${inner.replace(m[0], "<p>")}</div></div>`;
        }
        return `<blockquote>${inner}</blockquote>`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:\/\//i.test(href);
        const internal = href.startsWith("/");
        const attrs = external ? ` target="_blank" rel="noopener noreferrer"` : internal ? ` data-route="${escapeHtml(href)}"` : "";
        return `<a href="${internal ? "#" + escapeHtml(href) : escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ""}${attrs}>${text}</a>`;
      },
    },
  });
  const html = (md.parse(src) as string).replace(/<table>/g, '<div class="tablewrap"><table>').replace(/<\/table>/g, "</table></div>");
  return { html, toc };
}

/** Plain text of a markdown page, used by the docs search. */
export const plainText = (src: string) => src.replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`|\[\]()-]/g, " ").replace(/\s+/g, " ").trim();
