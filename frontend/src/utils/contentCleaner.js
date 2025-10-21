/**
 * @fileoverview Text cleaning utilities for preparing web content for LLM prompts.
 * 
 * This module provides a comprehensive suite of text cleaning functions designed to
 * remove noise, artifacts, and formatting from scraped web content, making it suitable
 * for use as input to Large Language Models. It handles HTML entities, mathematical
 * notation, code blocks, Wikipedia-specific markup, and various other text artifacts.
 * 
 * @module contentCleaner
 */

// ============================================================================
// BASIC TEXT NORMALIZATION
// ============================================================================

/**
 * Normalizes whitespace characters in text by removing excessive spaces,
 * non-breaking spaces, and redundant newlines.
 * 
 * @param {string} text - The text to normalize
 * @returns {string} Text with normalized whitespace
 * 
 * @example
 * normalizeWhitespace('Hello\u00A0\u00A0world\n\n\n\nTest')
 * // Returns: 'Hello world\n\nTest'
 */
export function normalizeWhitespace(text) {
  if (!text) return '';
  return text
    .replace(/\u00A0/g, ' ')           // Convert non-breaking spaces to regular spaces
    .replace(/\s+\n/g, '\n')            // Remove trailing spaces before newlines
    .replace(/\n{3,}/g, '\n\n')         // Limit consecutive newlines to maximum of 2
    .replace(/[ \t]{2,}/g, ' ')         // Collapse multiple spaces/tabs into single space
    .trim();
}

/**
 * Builds a text excerpt by truncating at word boundaries with an ellipsis.
 * Ensures clean cuts at the last space within the allowed length.
 * 
 * @param {string} text - The text to excerpt
 * @param {number} [max=240] - Maximum character length for the excerpt
 * @returns {string} Truncated text with ellipsis if shortened, or original if within limit
 * 
 * @example
 * buildExcerpt('This is a long sentence that needs truncating', 20)
 * // Returns: 'This is a long…'
 */
export function buildExcerpt(text, max = 240) {
  if (!text) return '';
  const clean = normalizeWhitespace(text);
  if (clean.length <= max) return clean;
  
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  // Only cut at word boundary if it's past halfway point to avoid too-short excerpts
  const cutPoint = lastSpace > max * 0.5 ? lastSpace : max;
  return cut.slice(0, cutPoint).trim() + '…';
}

/**
 * Removes duplicate lines from text while preserving order and limiting
 * consecutive blank lines to a maximum of one.
 * 
 * Uses case-insensitive comparison to detect duplicates. Preserves the first
 * occurrence of each unique line.
 * 
 * @param {string} text - The text to deduplicate
 * @returns {string} Text with duplicate lines removed
 * 
 * @example
 * dedupeRepeatingLines('Hello\nWorld\nHello\n\n\nTest')
 * // Returns: 'Hello\nWorld\n\nTest'
 */
export function dedupeRepeatingLines(text) {
  const lines = normalizeWhitespace(text).split('\n');
  const seen = new Set();
  const out = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Handle blank lines - allow max 1 consecutive blank line
    if (!trimmed) {
      const lastTwo = out.slice(-2);
      if (lastTwo.every(l => !l.trim())) continue; // Skip if last 2 lines are blank
      out.push(line);
      continue;
    }
    
    // Add non-blank lines only if not seen before (case-insensitive)
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(line);
    }
  }
  
  return out.join('\n');
}

/**
 * Prepares text for use in LLM prompts by normalizing and deduplicating.
 * This is a convenience function combining normalization and deduplication.
 * 
 * @param {string} text - The text to clean
 * @returns {string} Prompt-ready text
 * 
 * @example
 * cleanToPromptReady('Hello  world\nHello  world\n\n\n')
 * // Returns: 'Hello world'
 */
export function cleanToPromptReady(text) {
  if (!text) return '';
  return normalizeWhitespace(dedupeRepeatingLines(text));
}

// ============================================================================
// HTML & WEB CONTENT CLEANING
// ============================================================================

/**
 * Removes zero-width and other invisible Unicode characters that can
 * interfere with text processing.
 * 
 * @private
 * @param {string} text - The text to clean
 * @returns {string} Text without invisible characters
 */
function removeInvisibleChars(text) {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')  // Zero-width spaces, joiners, BOM
    .replace(/\u00AD/g, '')                  // Soft hyphens
    .replace(/[\u202A-\u202E]/g, '');        // Text direction markers
}

/**
 * Cleans HTML tags and converts HTML entities to their plain text equivalents.
 * Handles common entities like &lt;, &nbsp;, &mdash;, and numeric entities.
 * 
 * @private
 * @param {string} text - The text containing HTML artifacts
 * @returns {string} Text with HTML tags and entities converted
 */
function cleanHtmlArtifacts(text) {
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Map of common HTML entities to their replacements
  const entities = {
    '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"',
    '&apos;': "'", '&nbsp;': ' ', '&mdash;': '--', '&ndash;': '-',
    '&hellip;': '...', '&#39;': "'", '&rsquo;': "'", '&lsquo;': "'",
    '&rdquo;': '"', '&ldquo;': '"', '&middot;': '*', '&bull;': '*',
    '&deg;': ' degrees',
  };
  
  // Replace named entities
  for (const [entity, replacement] of Object.entries(entities)) {
    text = text.split(entity).join(replacement);
  }
  
  // Handle decimal numeric entities (&#123;)
  text = text.replace(/&#(\d+);/g, (match, dec) => {
    try {
      const code = parseInt(dec, 10);
      // Only convert printable ASCII characters
      return (code > 31 && code < 127) ? String.fromCharCode(code) : ' ';
    } catch {
      return ' ';
    }
  });
  
  // Handle hexadecimal numeric entities (&#xAB;)
  text = text.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
    try {
      const code = parseInt(hex, 16);
      return (code > 31 && code < 127) ? String.fromCharCode(code) : ' ';
    } catch {
      return ' ';
    }
  });
  
  return text;
}

/**
 * Removes Wikipedia-specific navigation and editorial markup.
 * Strips citation markers, edit links, and common Wikipedia page elements.
 * 
 * @private
 * @param {string} text - The text from a Wikipedia page
 * @returns {string} Text without Wikipedia-specific artifacts
 */
function cleanWikipediaArtifacts(text) {
  return text
    .replace(/Jump to (navigation|search|content)/gi, '')
    .replace(/From Wikipedia, the free encyclopedia/gi, '')
    .replace(/\[edit\]/gi, '')
    .replace(/\[citation needed\]/gi, '')
    .replace(/\[clarification needed\]/gi, '')
    .replace(/\[when\?\]/gi, '')
    .replace(/\[who\?\]/gi, '')
    .replace(/\[\d+\]/g, '')                    // Single reference numbers [1]
    .replace(/\[[\d,\s]+\]/g, '')               // Multiple reference numbers [1, 2, 3]
    .replace(/^\s*\^.*/gm, '')                  // Reference markers starting with ^
    .replace(/\s*Main article:\s*[^\n.]*/gi, '')
    .replace(/\s*See also:\s*[^\n.]*/gi, '');
}

/**
 * Removes URLs and email addresses from text.
 * 
 * @private
 * @param {string} text - The text containing URLs
 * @returns {string} Text without URLs and email addresses
 */
function cleanUrls(text) {
  return text
    .replace(/https?:\/\/[^\s)]+/g, ' ')        // HTTP(S) URLs
    .replace(/www\.[^\s)]+/g, ' ')              // www. URLs
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, ' ');    // Email addresses
}

/**
 * Removes or replaces code blocks with placeholder text.
 * Handles both fenced code blocks (```
 * 
 * @private
 * @param {string} text - The text containing code blocks
 * @returns {string} Text with code blocks removed or replaced
 */
function cleanCodeBlocks(text) {
  return text
    .replace(/```[\w]*\n?[\s\S]*?\n?```/g, ' [code block] ')
    .replace(/`[^`\n]+`/g, ' ')
    .replace(/\n {4,}.+/g, '');
}

// ============================================================================
// MATHEMATICAL & SCIENTIFIC CONTENT CLEANING
// ============================================================================

/**
 * Removes or replaces inline mathematical expressions with placeholder text.
 * Handles LaTeX-style math delimiters ($, $$, $$, $$).
 * 
 * @private
 * @param {string} text - The text containing math expressions
 * @returns {string} Text with math expressions replaced by [equation]
 */
function cleanInlineMath(text) {
  return text
    .replace(/\$\$[\s\S]*?\$\$/g, ' [equation] ')
    .replace(/\$[^$\n]{1,200}\$/g, ' [equation] ')
    .replace(/\\\([\s\S]*?\\\)/g, ' [equation] ')
    .replace(/\\\[[\s\S]*?\\\]/g, ' [equation] ');
}

/**
 * Removes complex scientific and mathematical notation including LaTeX commands,
 * equations, and lines with poor text-to-symbol ratios.
 * 
 * @private
 * @param {string} text - The text containing scientific notation
 * @returns {string} Text with scientific notation cleaned
 */
function cleanScientificText(text) {
  // Remove displaystyle equations
  text = text.replace(/\{\\displaystyle[\s\S]*?\}/g, ' [equation] ');
  
  // Remove LaTeX environments (e.g., \begin{equation}...\end{equation})
  text = text.replace(/\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g, ' [equation] ');
  
  // Remove LaTeX commands with optional arguments
  text = text.replace(/\\[a-zA-Z]+(\[[^\]]*\])?(\{[^}]*\})?/g, ' ');
  
  // Iteratively remove nested braces with LaTeX commands (max 5 iterations)
  let prevText;
  let iterations = 0;
  do {
    prevText = text;
    text = text.replace(/\{[^{}]*\\[a-zA-Z]+[^{}]*\}/g, ' [math] ');
    text = text.replace(/\{[^{}]*\}/g, ' ');
    iterations++;
  } while (prevText !== text && iterations < 5);
  
  // Clean up remaining LaTeX artifacts
  text = text.replace(/\\[a-zA-Z]+/g, '');
  text = text.replace(/\\/g, '');
  
  // Filter out lines that are mostly mathematical notation
  const lines = text.split('\n');
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.length < 3) return false;
    
    const textOnly = trimmed.replace(/\[(equation|math|code|link|email)\]/gi, '');
    const words = (textOnly.match(/\b[a-zA-Z]{2,}\b/g) || []);
    
    // Remove lines with no real words but have content
    if (words.length === 0 && textOnly.length > 0) return false;
    
    // Calculate letter-to-total-character ratio
    const letters = (textOnly.match(/[a-zA-Z]/g) || []).length;
    const ratio = textOnly.length > 0 ? letters / textOnly.length : 0;
    
    // Remove lines that are mostly symbols (< 25% letters)
    if (ratio < 0.25 && textOnly.length > 15) return false;
    
    // Remove lines with too many equations
    if (trimmed.match(/\[equation\]/g)?.length > 4) return false;
    
    return true;
  });
  
  return cleanedLines.join('\n');
}

/**
 * Converts Unicode mathematical symbols and Greek letters to ASCII equivalents.
 * Handles mathematical alphanumerics, superscripts, subscripts, and operators.
 * 
 * @private
 * @param {string} text - The text containing Unicode math symbols
 * @returns {string} Text with ASCII equivalents of math symbols
 */
function normalizeUnicodeMath(text) {
  // Map of mathematical Unicode letters to ASCII
  const mathAlphanumeric = {
    '𝑎': 'a', '𝑏': 'b', '𝑐': 'c', '𝑑': 'd', '𝑒': 'e', '𝑓': 'f',
    '𝑔': 'g', '𝘩': 'h', '𝑖': 'i', '𝑗': 'j', '𝑘': 'k', '𝑙': 'l',
    '𝑚': 'm', '𝑛': 'n', '𝑜': 'o', '𝑝': 'p', '𝑞': 'q', '𝑟': 'r',
    '𝑠': 's', '𝑡': 't', '𝑢': 'u', '𝑣': 'v', '𝑤': 'w', '𝑥': 'x',
    '𝑦': 'y', '𝑧': 'z',
    '𝐴': 'A', '𝐵': 'B', '𝐶': 'C', '𝐷': 'D', '𝐸': 'E', '𝐹': 'F',
    '𝐺': 'G', '𝐻': 'H', '𝐼': 'I', '𝐽': 'J', '𝐾': 'K', '𝐿': 'L',
    '𝑀': 'M', '𝑁': 'N', '𝑂': 'O', '𝑃': 'P', '𝑄': 'Q', '𝑅': 'R',
    '𝑆': 'S', '𝑇': 'T', '𝑈': 'U', '𝑉': 'V', '𝑊': 'W', '𝑋': 'X',
    '𝑌': 'Y', '𝑍': 'Z',
    '𝛼': 'alpha', '𝛽': 'beta', '𝛾': 'gamma', '𝛿': 'delta',
    '𝜀': 'epsilon', '𝜁': 'zeta', '𝜂': 'eta', '𝜃': 'theta',
    '𝜄': 'iota', '𝜅': 'kappa', '𝜆': 'lambda', '𝜇': 'mu',
    '𝜈': 'nu', '𝜉': 'xi', '𝜋': 'pi', '𝜌': 'rho',
    '𝜎': 'sigma', '𝜏': 'tau', '𝜐': 'upsilon', '𝜑': 'phi',
    '𝜒': 'chi', '𝜓': 'psi', '𝜔': 'omega',
  };

  // Replace mathematical alphanumerics
  for (const [math, normal] of Object.entries(mathAlphanumeric)) {
    text = text.split(math).join(normal);
  }

  // Convert superscripts to caret notation (e.g., x² → x^2)
  text = text.replace(/([0-9.]+)([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾]+)/g, (match, base, superscripts) => {
    const superMap = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')' };
    const converted = superscripts.split('').map(c => superMap[c] || c).join('');
    return base + '^' + converted;
  });
  
  // Convert subscripts to underscore notation (e.g., H₂O → H_2O)
  text = text.replace(/([a-zA-Z0-9.]+)([₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+)/g, (match, base, subscripts) => {
    const subMap = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', '₊': '+', '₋': '-', '₌': '=', '₍': '(', '₎': ')' };
    const converted = subscripts.split('').map(c => subMap[c] || c).join('');
    return base + '_' + converted;
  });
  
  // Map of Greek letters and mathematical operators to ASCII
  const mathMap = {
    'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta', 'ε': 'epsilon', 'ζ': 'zeta', 'η': 'eta', 'θ': 'theta',
    'ι': 'iota', 'κ': 'kappa', 'λ': 'lambda', 'μ': 'mu', 'µ': 'mu', 'ν': 'nu', 'ξ': 'xi', 'π': 'pi', 'ρ': 'rho',
    'σ': 'sigma', 'ς': 'sigma', 'τ': 'tau', 'υ': 'upsilon', 'φ': 'phi', 'χ': 'chi', 'ψ': 'psi', 'ω': 'omega',
    'Α': 'Alpha', 'Β': 'Beta', 'Γ': 'Gamma', 'Δ': 'Delta', 'Ε': 'Epsilon', 'Ζ': 'Zeta', 'Η': 'Eta', 'Θ': 'Theta',
    'Ι': 'Iota', 'Κ': 'Kappa', 'Λ': 'Lambda', 'Μ': 'Mu', 'Ν': 'Nu', 'Ξ': 'Xi', 'Π': 'Pi', 'Ρ': 'Rho',
    'Σ': 'Sigma', 'Τ': 'Tau', 'Υ': 'Upsilon', 'Φ': 'Phi', 'Χ': 'Chi', 'Ψ': 'Psi', 'Ω': 'Omega',
    '∫': 'integral', '∬': 'double-integral', '∭': 'triple-integral', '∑': 'sum', '∏': 'product',
    '√': 'sqrt', '∛': 'cbrt', '∜': 'fourthrt', '∞': 'infinity', '∂': 'partial', '∇': 'nabla', '∆': 'delta',
    '≈': '~', '≠': '!=', '≤': '<=', '≥': '>=', '≡': '===', '≢': '!==', '±': '+/-', '∓': '-/+',
    '×': 'x', '·': '*', '÷': '/', '→': '->', '←': '<-', '↔': '<->', '⇒': '=>', '⇐': '<=', '⇔': '<=>',
    '↑': '^', '↓': 'v', '°': ' degrees', '℃': 'C', '℉': 'F', 'ℏ': 'h-bar', 'ℓ': 'l',
    'ℕ': 'N', 'ℤ': 'Z', 'ℚ': 'Q', 'ℝ': 'R', 'ℂ': 'C',
    '′': "'", '″': '"', '‴': "'''", '∅': 'empty-set', '∈': 'in', '∉': 'not-in',
    '⊂': 'subset', '⊃': 'superset', '∀': 'forall', '∃': 'exists', '∧': 'and', '∨': 'or', '¬': 'not',
  };
  
  // Replace all mathematical symbols
  for (const [unicode, replacement] of Object.entries(mathMap)) {
    text = text.split(unicode).join(replacement);
  }
  
  return text;
}

/**
 * Detects and removes fragmented equations and mathematical notation that
 * wasn't caught by earlier cleaning passes.
 * 
 * Uses heuristic patterns to identify equation fragments:
 * - Multiple spaced single letters (e.g., "a b c d e f g")
 * - Greek letter names in equations
 * - Equations with subscripts
 * - Variable definitions ("where x is...")
 * 
 * @private
 * @param {string} text - The text potentially containing equation fragments
 * @returns {string} Text with equation fragments cleaned
 */
function cleanEquationFragments(text) {
  // Fix common math italic letter artifacts
  text = text.replace(/ℎ/g, 'h').replace(/ℓ/g, 'l').replace(/ℯ/g, 'e');
  
  // Fix subscript spacing issues (e.g., "a i j" → "a_ij")
  text = text
    .replace(/\b([a-z]+)\s+i\s+j\b/g, '$1_ij')
    .replace(/\bi\s+t\s+h\b/g, 'ith')
    .replace(/\bj\s+t\s+h\b/g, 'jth');
  
  // PATTERN 0: 7+ spaced single letters (likely an equation)
  text = text.replace(/\b([a-z]\s+){7,}[a-z]/gi, ' [equation] ');
  
  // PATTERN 1: Equations with Greek letter names
  text = text.replace(/\b[a-z]\s+[a-z][^=]{0,40}?=\s*[^.;]{0,80}?\b(rho|mu|nu|tau|sigma|kappa|lambda|delta|epsilon|theta|phi|psi|omega|alpha|beta|gamma)\b[^.;]{0,80}/gi, ' [equation] ');
  
  // PATTERN 2: Equations with many spaced variables
  text = text.replace(/\b[a-z]+\s*=\s*-?\s*[a-z]+(\s+[a-z]){3,}/gi, ' [equation] ');
  
  // PATTERN 3: Equations with subscripts
  text = text.replace(/\b[a-z]+_[ij]+\s*=\s*[a-z]+\s*\([^)]{10,}\)/gi, ' [equation] ');
  
  // PATTERN 4: Long parenthetical with many spaced letters
  text = text.replace(/\([^)]*?(\s+[a-z]){6,}[^)]*?\)/gi, ' ');
  // PATTERN 5: Sequences of 5-6 spaced letters
  text = text.replace(/\b([a-z]\s+){5,6}[a-z]\b/gi, ' ');
  
  // Remove "where X is Y" variable definitions
  text = text.replace(/\s+where\s+[a-z_]+\s+is\s+the\s+[^.]+?\./gi, '.');
  
  // SMART DETECTION: Analyze remaining equations with equals signs
  const equationPattern = /\b[a-zA-Z][a-zA-Z0-9_/\s()\[\]]*\s*=\s*[^.;!?\n]{1,150}/g;
  
  text = text.replace(equationPattern, (match) => {
    const trimmed = match.trim();
    const singleLetters = (trimmed.match(/\b[a-z]\b/gi) || []).length;
    const length = trimmed.length;
    const spaces = (trimmed.match(/\s/g) || []).length;
    const hasGreek = /(rho|mu|nu|tau|sigma|alpha|beta|gamma|delta|theta|lambda|phi|omega|kappa|epsilon)/i.test(trimmed);
    const hasSubscript = /_/.test(trimmed);
    const hasMultipleSpacedVars = /(\s+[a-z]){4,}/i.test(trimmed);
    
    // KEEP simple, readable equations (e.g., "x = 5" or "area = width * height")
    if (length < 30 && singleLetters <= 5 && spaces < 10 && !hasGreek && !hasSubscript && !hasMultipleSpacedVars) {
      return trimmed.replace(/\s+/g, ' ');
    }
    
    return ' [equation] ';
  });
  
  // Remove orphaned mathematical symbols
  text = text.replace(/[⋅·×∇∂]/g, ' ').replace(/−/g, '-');
  
  // Final cleanup pass
  text = text
    .replace(/\s{2,}/g, ' ')
    .replace(/\[equation\]\s*[.,]?\s*\[equation\]/g, '[equation]')
    .replace(/\s+\[equation\]\s+/g, ' [equation] ')
    .replace(/\.\s*\[equation\]\s*\./g, '.');
  
  return text;
}

// ============================================================================
// TABLE & FORMATTING CLEANING
// ============================================================================

/**
 * Removes ASCII table formatting characters and pipe-separated table rows.
 * Filters out table separator lines and converts remaining pipes to spaces.
 * 
 * @private
 * @param {string} text - The text containing table artifacts
 * @returns {string} Text with table formatting removed
 */
function cleanTableArtifacts(text) {
  const lines = text.split('\n');
  const cleaned = lines.filter(line => {
    const trimmed = line.trim();
    
    // Remove lines that are purely table separators (-, =, |, :, +)
    if (/^[\s\-=|:+]+$/.test(trimmed)) return false;
    
    // Check for table rows with multiple pipes
    const pipeCount = (trimmed.match(/\|/g) || []).length;
    if (pipeCount > 3) {
      const formattingChars = (trimmed.match(/[\-=|:+\s]/g) || []).length;
      // Remove if >70% formatting characters
      if (formattingChars / trimmed.length > 0.7) return false;
    }
    
    return true;
  });
  
  // Remove remaining pipes and plus signs
  return cleaned.join('\n').replace(/\|/g, ' ').replace(/\+/g, ' ');
}

/**
 * Removes emoji characters from text using Unicode ranges.
 * Covers all major emoji blocks including emoticons, symbols, and pictographs.
 * 
 * @private
 * @param {string} text - The text containing emojis
 * @returns {string} Text without emoji characters
 */
function removeEmoji(text) {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')  // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')  // Symbols & Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')  // Transport & Map
    .replace(/[\u{1F700}-\u{1F77F}]/gu, '')  // Alchemical Symbols
    .replace(/[\u{1F780}-\u{1F7FF}]/gu, '')  // Geometric Shapes Extended
    .replace(/[\u{1F800}-\u{1F8FF}]/gu, '')  // Supplemental Arrows-C
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')  // Supplemental Symbols and Pictographs
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')  // Chess Symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')  // Symbols and Pictographs Extended-A
    .replace(/[\u{2600}-\u{26FF}]/gu, '')    // Miscellaneous Symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '');   // Dingbats
}

/**
 * Removes control characters that would make text invalid for JSON serialization.
 * Preserves standard whitespace (space, tab, newline) while removing other
 * control characters in the C0 and C1 ranges.
 * 
 * @private
 * @param {string} text - The text to escape
 * @returns {string} JSON-safe text
 */
function escapeForJson(text) {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')  // Remove C0 controls except \t, \n, \r
    .replace(/\0/g, '');                                 // Remove null bytes
}

// ============================================================================
// VALIDATION HELPER
// ============================================================================

/**
 * Validates cleaned text to ensure it meets quality standards.
 * Checks for minimum word count and reasonable character distribution.
 * 
 * @private
 * @param {string} text - The text to validate
 * @param {number} minWords - Minimum number of words required
 * @returns {{valid: boolean, warnings: string[]}} Validation result with any warnings
 */
function validateCleanedText(text, minWords) {
  const warnings = [];
  
  // Check minimum word count
  const words = text.match(/\b[a-zA-Z]{2,}\b/g) || [];
  if (words.length < minWords) {
    warnings.push(`Only ${words.length} words found (minimum: ${minWords})`);
    return { valid: false, warnings };
  }
  
  // Check if text is mostly placeholder tags
  const placeholderCount = (text.match(/$$(equation|code|math)$$/g) || []).length;
  if (placeholderCount > words.length * 0.3) {
    warnings.push(`Too many placeholders: ${placeholderCount} vs ${words.length} words`);
  }
  
  // Check letter-to-total ratio
  const letters = (text.match(/[a-zA-Z]/g) || []).length;
  const ratio = text.length > 0 ? letters / text.length : 0;
  if (ratio < 0.3) {
    warnings.push(`Low letter ratio: ${(ratio * 100).toFixed(1)}%`);
  }
  
  return { valid: true, warnings };
}

// ============================================================================
// MAIN CLEANING FUNCTION
// ============================================================================

/**
 * Aggressively cleans web content text for use in LLM prompts.
 * 
 * This is the main entry point that applies all cleaning operations in sequence:
 * 1. Removes invisible characters and control characters
 * 2. Cleans HTML tags and entities
 * 3. Removes URLs, code blocks, and tables
 * 4. Strips Wikipedia-specific markup
 * 5. Handles mathematical notation and equations
 * 6. Removes emojis and normalizes Unicode
 * 7. Deduplicates and normalizes whitespace
 * 8. Truncates to maximum length if needed
 * 9. Validates output quality
 * 
 * @param {string} text - The raw text to clean
 * @param {Object} [options={}] - Configuration options
 * @param {number} [options.maxLength=5000] - Maximum output length in characters
 * @param {number} [options.minWords=10] - Minimum word count for validation
 * @param {boolean} [options.aggressiveUnicode=false] - If true, removes all non-ASCII characters
 * @param {boolean} [options.preserveEquations=false] - If true, skips Unicode math normalization
 * @param {boolean} [options.silent=false] - If true, suppresses console logging
 * @returns {string} Cleaned and validated text ready for LLM prompts
 * 
 * @example
 * const cleaned = agressiveTextCleaner(htmlContent, {
 *   maxLength: 3000,
 *   minWords: 50,
 *   silent: false
 * });
 * 
 * @example
 * // With aggressive Unicode cleaning
 * const asciiOnly = agressiveTextCleaner(text, {
 *   aggressiveUnicode: true
 * });
 */
export function agressiveTextCleaner(text, options = {}) {
  const { 
    maxLength = 5000, 
    minWords = 10, 
    aggressiveUnicode = false, 
    preserveEquations = false, 
    silent = false 
  } = options;
  
  if (!text || typeof text !== 'string') return '';
  
  const originalLength = text.length;
  let cleaned = text;
  
  try {
    // Apply cleaning operations in sequence
    cleaned = removeInvisibleChars(cleaned);
    cleaned = escapeForJson(cleaned);
    cleaned = cleanHtmlArtifacts(cleaned);
    cleaned = cleanUrls(cleaned);
    cleaned = cleanCodeBlocks(cleaned);
    cleaned = cleanTableArtifacts(cleaned);
    cleaned = cleanWikipediaArtifacts(cleaned);
    cleaned = cleanInlineMath(cleaned);
    cleaned = cleanScientificText(cleaned);
    
    if (!preserveEquations) cleaned = normalizeUnicodeMath(cleaned);
    
    cleaned = cleanEquationFragments(cleaned);
    cleaned = removeEmoji(cleaned);
    
    // Optional: Strip all non-ASCII characters
    if (aggressiveUnicode) cleaned = cleaned.replace(/[^\x00-\x7F]/g, '');
    
    // Final normalization and deduplication
    cleaned = cleanToPromptReady(cleaned);
    
    // Truncate if exceeds maximum length
    if (cleaned.length > maxLength) {
      const truncated = cleaned.substring(0, maxLength);
      const lastPeriod = truncated.lastIndexOf('.');
      const lastNewline = truncated.lastIndexOf('\n');
      const cutPoint = Math.max(lastPeriod, lastNewline);
      
      // Cut at sentence/paragraph boundary if within last 20% of text
      cleaned = cutPoint > maxLength * 0.8 
        ? truncated.substring(0, cutPoint + 1) 
        : truncated + '...';
    }
    
    // Validate the cleaned text
    const validation = validateCleanedText(cleaned, minWords);
    if (!validation.valid) {
      if (!silent) console.warn('[agressiveTextCleaner] Validation failed:', validation.warnings);
      // Fallback: return normalized version of original text
      return normalizeWhitespace(text.substring(0, maxLength));
    }
    
    // Log warnings even on successful validation
    if (!silent && validation.warnings.length > 0) {
      console.info('[agressiveTextCleaner] Warnings:', validation.warnings);
    }
    
    // Log cleaning statistics
    if (!silent) {
      const reduction = ((1 - cleaned.length / originalLength) * 100).toFixed(1);
      console.info(`[agressiveTextCleaner] Cleaned: ${reduction}% reduction (${originalLength} → ${cleaned.length} chars)`);
    }
    
    return cleaned;
    
  } catch (error) {
    if (!silent) console.error('[agressiveTextCleaner] Error:', error.message);
    // Fallback: return normalized version of original text
    return normalizeWhitespace(text.substring(0, maxLength));
  }
}

/**
 * Default export for convenience
 * @see {agressiveTextCleaner}
 */
export default agressiveTextCleaner;
