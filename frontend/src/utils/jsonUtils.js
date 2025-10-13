// src/utils/jsonUtils.js

/**
 * Sanitizes a JSON string by removing control characters and extraneous formatting.
 * @param {string} jsonString The raw string from the AI.
 * @returns {string} A cleaner JSON string.
 */
export function sanitizeJSON(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    return '';
  }

  // Remove leading/trailing whitespace and code block markers
  let cleaned = jsonString.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Replace escaped control characters within strings
  return cleaned.replace(/\n/g, "\\n")
                .replace(/\t/g, "\\t")
                .replace(/\r/g, "\\r")
                .replace(/\b/g, "\\b")
                .replace(/\f/g, "\\f");
}
