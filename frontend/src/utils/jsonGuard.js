/**
 * @fileoverview JSON guard utility with robust parsing and repair capabilities.
 * 
 * This module provides comprehensive JSON parsing utilities designed to handle
 * imperfect JSON data from AI models and other unreliable sources. It includes
 * multiple parsing strategies, automatic repair mechanisms, and validation
 * capabilities to ensure reliable JSON processing.
 * 
 * The utility is particularly valuable for processing AI-generated JSON which
 * often contains formatting issues, markdown artifacts, or structural problems
 * that would cause standard JSON.parse() to fail.
 * 
 * Key features include:
 * - Multiple parsing attempts with different cleaning strategies
 * - Markdown code block extraction
 * - Quote normalization
 * - Common syntax error correction
 * - Optional AI-assisted repair for complex issues
 * - Schema validation support
 * 
 * @module jsonGuard
 */

/**
 * Safely attempts to parse JSON.
 * 
 * @param {string} jsonText - JSON text to parse
 * @returns {Object} Parse result with ok flag, value/error
 * @property {boolean} ok - Whether parsing was successful
 * @property {*} [value] - Parsed value if successful
 * @property {Error} [error] - Error object if parsing failed
 * 
 * @example
 * const result = tryParse('{"valid": "json"}');
 * if (result.ok) {
 *   console.log('Parsed:', result.value);
 * } else {
 *   console.error('Parse failed:', result.error.message);
 * }
 */
function tryParse(jsonText) {
  if (typeof jsonText !== 'string') {
    return { ok: false, error: new Error('Input is not a string') };
  }

  try {
    const parsed = JSON.parse(jsonText);
    return { ok: true, value: parsed };
  } catch (e) {
    return { ok: false, error: e };
  }
}

/**
 * Extracts JSON block from text that might contain markdown or extra content.
 * 
 * Attempts to extract clean JSON from text that may be wrapped in markdown
 * code blocks or mixed with other content. Looks for JSON objects or arrays
 * and extracts complete, properly balanced structures.
 * 
 * @param {string} text - Text that may contain JSON
 * @returns {string} Extracted JSON block or cleaned text
 * 
 * @example
 * const markdown = '```json\\n{"name": "John"}\\n```';
 * const jsonBlock = extractJsonBlock(markdown); // '{"name": "John"}'
 */
function extractJsonBlock(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove any leading/trailing whitespace
  text = text.trim();

  // Try to extract from markdown code blocks
  const fencePatterns = [/```json\s*([\s\S]*?)```/i, /```\s*([\s\S]*?)```/i, /`([\s\S]*?)`/];

  for (const pattern of fencePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const extracted = match[1].trim();
      if (extracted) return extracted;
    }
  }

  // Find first complete JSON object or array
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');

  let start = -1;
  let startChar = '';

  if (firstBrace >= 0 && (firstBrace < firstBracket || firstBracket < 0)) {
    start = firstBrace;
    startChar = '{';
  } else if (firstBracket >= 0) {
    start = firstBracket;
    startChar = '[';
  }

  if (start < 0) {
    return text.trim();
  }

  // Find matching closing bracket/brace
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  const endChar = startChar === '{' ? '}' : ']';

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    // Handle escape sequences
    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    // Handle strings
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    // Only count brackets/braces outside of strings
    if (!inString) {
      if (char === startChar) {
        depth++;
      } else if (char === endChar) {
        depth--;
        if (depth === 0) {
          return text.slice(start, i + 1).trim();
        }
      }
    }
  }

  // If we couldn't find matching bracket, return from start to end
  return text.slice(start).trim();
}

/**
 * Normalizes various quote types to standard JSON quotes.
 * 
 * Converts smart quotes and other typographic quotation marks to standard
 * ASCII quotes that are valid in JSON. This is particularly important
 * for processing text from word processors or web content.
 * 
 * @param {string} jsonish - Text with potentially non-standard quotes
 * @returns {string} Text with normalized quotes
 * 
 * @example
 * const text = '“smart quotes”'; // Contains unicode smart quotes
 * const normalized = normalizeQuotes(text); // '"smart quotes"'
 */
function normalizeQuotes(jsonish) {
  if (typeof jsonish !== 'string') {
    return '';
  }

  return jsonish
    .replace(/[""]/g, '"') // Smart quotes to regular quotes
    .replace(/[']/g, "'"); // Smart single quotes to regular
}

/**
 * Additional cleanup for common JSON issues.
 * 
 * Applies various corrections to address frequent JSON formatting problems:
 * - Removes Byte Order Marks (BOM)
 * - Fixes trailing commas before closing braces/brackets
 * - Corrects unnecessary escaping of single quotes
 * 
 * @param {string} jsonText - JSON text to clean
 * @returns {string} Cleaned JSON text
 * 
 * @example
 * const messy = '{ "name": "John", }'; // Trailing comma
 * const clean = cleanupJson(messy); // '{ "name": "John" }'
 */
function cleanupJson(jsonText) {
  if (typeof jsonText !== 'string') {
    return '';
  }

  let cleaned = jsonText;

  // Remove BOM if present
  if (cleaned.charCodeAt(0) === 0xfeff) {
    cleaned = cleaned.slice(1);
  }

  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  // Fix common escaping issues
  cleaned = cleaned.replace(/\\'/g, "'"); // Don't need to escape single quotes in JSON

  return cleaned;
}

/**
 * Main parsing function with repair capabilities.
 * 
 * Attempts to parse and validate JSON through multiple strategies:
 * 1. Direct parsing of raw input
 * 2. Extraction and cleaning of JSON blocks from markdown
 * 3. Quote normalization and additional cleanup
 * 4. Optional AI-assisted repair for complex issues
 * 
 * @param {Object} options - Configuration options
 * @param {string|Object} options.raw - Raw text or object to parse
 * @param {Object} [options.schema] - Expected schema for validation
 * @param {Function} [options.validate] - Validation function
 * @param {Function} [options.repairFn] - AI repair function (optional)
 * @returns {Promise<Object>} Parsed and validated object
 * 
 * @throws {Error} If all parsing attempts fail
 * 
 * @example
 * try {
 *   const result = await parseWithRepair({
 *     raw: '```json\\n{"valid": true}\\n```',
 *     validate: (obj) => obj.valid === true
 *   });
 *   console.log('Parsed result:', result);
 * } catch (error) {
 *   console.error('Parsing failed:', error.message);
 * }
 */
export async function parseWithRepair({ raw, schema, validate, repairFn }) {
  if (!raw) {
    throw new Error('No data provided to parse');
  }

  if (typeof raw !== 'string') {
    // If it's already an object, validate and return
    if (typeof raw === 'object') {
      if (!validate || validate(raw)) {
        return raw;
      }
      throw new Error('Provided object failed validation');
    }
    throw new Error('Input must be a string or object');
  }

  const attempts = [];

  // Attempt 1: Direct parse
  let result = tryParse(raw);
  attempts.push({ method: 'direct parse', success: result.ok });

  if (result.ok) {
    if (!validate || validate(result.value)) {
      return result.value;
    }
    attempts.push({ method: 'direct parse validation', success: false });
  }

  // Attempt 2: Extract JSON block and normalize quotes
  const block = extractJsonBlock(raw);
  const normalized = normalizeQuotes(block);
  const cleaned = cleanupJson(normalized);

  result = tryParse(cleaned);
  attempts.push({ method: 'extract + normalize + clean', success: result.ok });

  if (result.ok) {
    if (!validate || validate(result.value)) {
      return result.value;
    }
    attempts.push({ method: 'cleaned validation', success: false });
  }

  // Attempt 3: Try just the extracted block
  result = tryParse(block);
  attempts.push({ method: 'extract only', success: result.ok });

  if (result.ok) {
    if (!validate || validate(result.value)) {
      return result.value;
    }
    attempts.push({ method: 'extract validation', success: false });
  }

  // Attempt 4: Model-assisted repair if provided
  if (typeof repairFn === 'function') {
    try {
      const repairedText = await repairFn(cleaned || block || raw);

      if (repairedText && typeof repairedText === 'string') {
        result = tryParse(repairedText);
        attempts.push({ method: 'AI repair direct', success: result.ok });

        if (result.ok) {
          if (!validate || validate(result.value)) {
            return result.value;
          }
          attempts.push({ method: 'AI repair validation', success: false });
        }

        // Try extracting from repaired text
        const repairedBlock = extractJsonBlock(repairedText);
        const repairedCleaned = cleanupJson(normalizeQuotes(repairedBlock));

        result = tryParse(repairedCleaned);
        attempts.push({ method: 'AI repair + extract', success: result.ok });

        if (result.ok) {
          if (!validate || validate(result.value)) {
            return result.value;
          }
          attempts.push({ method: 'AI repair + extract validation', success: false });
        }
      }
    } catch (repairError) {
      console.warn('AI repair function failed:', repairError);
      attempts.push({ method: 'AI repair', success: false, error: repairError.message });
    }
  }

  // All attempts failed - throw detailed error
  const preview = (raw || '').slice(0, 500);
  const attemptsSummary = attempts
    .map((a) => `  - ${a.method}: ${a.success ? 'OK' : 'FAILED'}${a.error ? ` (${a.error})` : ''}`)
    .join('\n');

  throw new Error(
    `Failed to parse and validate JSON after ${attempts.length} attempts.\n\n` +
      `Attempts:\n${attemptsSummary}\n\n` +
      `Preview of raw data:\n${preview}${raw.length > 500 ? '...' : ''}`
  );
}

/**
 * Quick helper to safely parse JSON with fallback.
 * 
 * Provides a simple interface for JSON parsing that returns a fallback
 * value instead of throwing an error when parsing fails.
 * 
 * @param {string} text - JSON text to parse
 * @param {*} [fallback=null] - Value to return if parsing fails
 * @returns {*} Parsed JSON value or fallback value
 * 
 * @example
 * const result = safeJsonParse('{"valid": true}', {}); // {valid: true}
 * const fallback = safeJsonParse('invalid', {}); // {}
 */
export function safeJsonParse(text, fallback = null) {
  const result = tryParse(text);
  return result.ok ? result.value : fallback;
}