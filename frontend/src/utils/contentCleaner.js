// src/utils/contentCleaner.js
// Minimal, safe cleaning to reduce boilerplate and normalize text before prompting.

export function normalizeWhitespace(text) {
    if (!text) return '';
    return text
      .replace(/\u00A0/g, ' ')   // non-breaking space
      .replace(/\s+\n/g, '\n')   // trim trailing spaces on lines
      .replace(/\n{3,}/g, '\n\n')// collapse excessive blank lines
      .replace(/[ \t]{2,}/g, ' ')// collapse multiple spaces/tabs
      .trim();
  }
  
  export function buildExcerpt(text, max = 240) {
    if (!text) return '';
    const clean = normalizeWhitespace(text);
    if (clean.length <= max) return clean;
    const cut = clean.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return `${cut.slice(0, lastSpace > 120 ? lastSpace : max)}…`;
  }
  
  // Optional: lightweight de-duplication of footer/headers in long texts
  export function dedupeRepeatingLines(text) {
    const lines = normalizeWhitespace(text).split('\n');
    const seen = new Set();
    const out = [];
    for (const line of lines) {
      const key = line.toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        out.push(line);
      }
    }
    return out.join('\n');
  }
  
  export function cleanToPromptReady(text) {
    // Compose minimal cleaning steps; keep structure hints (newlines) intact.
    return normalizeWhitespace(dedupeRepeatingLines(text));
  }
  