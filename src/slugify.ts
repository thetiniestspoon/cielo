// Mirror of the vault cortex slugify (_meta/cortex/slugify.py) so we can
// map vault_graph.json node IDs (titles) to hub slugs used by hubs.json
// and signals.json.
//
// Keep in lockstep with the Python implementation:
//   - NFKD unicode normalize, strip combining marks
//   - lowercase
//   - drop non-word chars (keep spaces and hyphens)
//   - collapse runs of whitespace/hyphens into a single hyphen
//   - trim leading/trailing hyphens
export function slugify(title: string): string {
  if (!title || !title.trim()) return "";
  const normalized = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const cleaned = normalized.toLowerCase().replace(/[^\w\s-]/g, "");
  const slug = cleaned.replace(/[-\s]+/g, "-").replace(/^-+|-+$/g, "");
  return slug;
}
