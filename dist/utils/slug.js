"use strict";
/**
 * Generic slug helpers for content modules (blog, etc.).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = slugify;
exports.normalizeTags = normalizeTags;
function slugify(raw, maxLen = 80) {
    const base = raw
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");
    return (base || "post").slice(0, maxLen);
}
/** Normalize tags: trim, lowercase, drop empties, unique */
function normalizeTags(tags) {
    if (!tags?.length)
        return [];
    const seen = new Set();
    const out = [];
    for (const t of tags) {
        const n = t.trim().toLowerCase().replace(/\s+/g, "-");
        if (!n || seen.has(n))
            continue;
        seen.add(n);
        out.push(n.slice(0, 40));
    }
    return out;
}
