import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = join(here, "..", "stratego.html");

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
  const context = vm.createContext({ Math, JSON, console, Date });
  for (const id of names) {
    vm.runInContext(extractScript(html, id), context, { filename: `${id}.js` });
  }
  return context.Stratego;
}
