/** A tiny syntax highlighter for the docs (bash, js/ts, python, json). It never needs the network and adds no dependency. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const KEYWORDS: Record<string, string> = {
  js: "const let var function return if else for while await async import from export default new class try catch throw true false null undefined typeof of in",
  python: "def class return if elif else for while import from as with try except raise True False None in not and or is lambda pass yield",
  bash: "if then else fi for do done while case esac function export source cd echo npm bash python3 git npx node",
  json: "true false null",
};

export function highlight(code: string, langRaw: string): string {
  const lang = /^(js|jsx|ts|tsx|javascript|typescript|mjs)$/.test(langRaw) ? "js" : /^(py|python)$/.test(langRaw) ? "python" : /^(sh|bash|shell|zsh|console)$/.test(langRaw) ? "bash" : langRaw === "json" ? "json" : "";
  if (!lang) return esc(code);
  const kw = KEYWORDS[lang].split(" ").join("|");
  const comment = lang === "js" ? "\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/" : lang === "json" ? "(?!)" : "#[^\\n]*";
  const re = new RegExp(`(${comment})|("(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'|\`(?:\\\\.|[^\`\\\\])*\`)|(\\b(?:${kw})\\b)|(\\b0x[0-9a-fA-F]+\\b|\\b\\d+(?:\\.\\d+)?\\b)`, "g");
  let out = "";
  let last = 0;
  for (const m of code.matchAll(re)) {
    const i = m.index ?? 0;
    out += esc(code.slice(last, i));
    const cls = m[1] ? "c" : m[2] ? "s" : m[3] ? "k" : "n";
    out += `<span class="tok-${cls}">${esc(m[0])}</span>`;
    last = i + m[0].length;
  }
  return out + esc(code.slice(last));
}
