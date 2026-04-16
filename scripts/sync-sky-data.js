// Mirror vault + command-center JSON sources into public/.
// Runs once by default. Pass --watch to re-copy on source changes.
// Safe to run with missing sources — logs a warning and skips.

import { promises as fs } from "node:fs";
import { existsSync, watchFile } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(REPO_ROOT, "public");

const VAULT = "C:/Users/shawn/Dropbox/Foundry-Satellite/satellite-Vault";
const CC = "C:/Users/shawn/OneDrive/Documents/ADL-Foundry/GitRepositories/command-center";

const MAPPINGS = [
  { src: path.join(VAULT, "_meta/vault_graph.json"), dest: path.join(PUBLIC, "vault_graph.json") },
  { src: path.join(CC, "assist-snapshot.json"), dest: path.join(PUBLIC, "weather/pressure.json") },
  { src: path.join(VAULT, "_meta/signals.json"), dest: path.join(PUBLIC, "weather/heat.json") },
  { src: path.join(CC, "sessions.json"), dest: path.join(PUBLIC, "weather/mood.json") },
];

async function copyOne({ src, dest }) {
  if (!existsSync(src)) {
    console.warn(`[sky-sync] skip (missing): ${src}`);
    return false;
  }
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
  return true;
}

async function syncAll() {
  const results = await Promise.allSettled(MAPPINGS.map(copyOne));
  const ok = results.filter((r) => r.status === "fulfilled" && r.value).length;
  console.log(`[sky-sync] ${ok}/${MAPPINGS.length} sources mirrored at ${new Date().toISOString()}`);
}

await syncAll();

if (process.argv.includes("--watch")) {
  console.log("[sky-sync] watching sources...");
  for (const m of MAPPINGS) {
    if (!existsSync(m.src)) continue;
    watchFile(m.src, { interval: 2000 }, () => {
      copyOne(m).then(() => console.log(`[sky-sync] re-mirrored ${path.basename(m.src)}`));
    });
  }
  // keep process alive
  process.stdin.resume();
}
