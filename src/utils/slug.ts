/**
 * Generic slug helpers for content modules (blog, etc.).
 */

export function slugify(raw: string, maxLen = 80): string {
  const base = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return (base || "post").slice(0, maxLen);
}

/** Normalize tags: trim, lowercase, drop empties, unique */
export function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const n = t.trim().toLowerCase().replace(/\s+/g, "-");
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n.slice(0, 40));
  }
  return out;
}
