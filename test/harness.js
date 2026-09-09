import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = join(here, "..", "field-marshal.html");

function extractScript(html, id) {
  const re = new RegExp(
    `<script id="${id}">([\\s\\S]*?)<\\/script>`, "i"
  );
  const m = html.match(re);
  if (!m) throw new Error(`script block id="${id}" not found`);
  return m[1];
}

export function loadModules(names = ["rng", "engine", "ai"]) {
  const html = readFileSync(HTML_PATH, "utf8");
  const src = names.map((id) => extractScript(html, id)).join("\n;\n");
  const g = {};
  // eslint-disable-next-line no-new-func
  new Function("globalThis", src)(g);
  return g.Stratego;
}
