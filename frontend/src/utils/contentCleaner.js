// src/utils/contentCleaner.js
export function normalizeWhitespace(text) {
  if (!text) return '';
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function buildExcerpt(text, max = 240) {
  if (!text) return '';
  const clean = normalizeWhitespace(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  const cutPoint = lastSpace > max * 0.5 ? lastSpace : max;
  return ` + cut.slice(0, cutPoint).trim() + '…' + `;
}

export function dedupeRepeatingLines(text) {
  const lines = normalizeWhitespace(text).split('\n');
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      const lastTwo = out.slice(-2);
      if (lastTwo.every(l => !l.trim())) continue;
      out.push(line);
      continue;
    }
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(line);
    }
  }
  return out.join('\n');
}

export function cleanToPromptReady(text) {
  if (!text) return '';
  return normalizeWhitespace(dedupeRepeatingLines(text));
}

function removeInvisibleChars(text) {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00AD/g, '')
    .replace(/[\u202A-\u202E]/g, '');
}

function cleanHtmlArtifacts(text) {
  text = text.replace(/<[^>]+>/g, ' ');
  const entities = {
    '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"',
    '&apos;': "'", '&nbsp;': ' ', '&mdash;': '--', '&ndash;': '-',
    '&hellip;': '...', '&#39;': "'", '&rsquo;': "'", '&lsquo;': "'",
    '&rdquo;': '"', '&ldquo;': '"', '&middot;': '*', '&bull;': '*',
    '&deg;': ' degrees',
  };
  for (const [entity, replacement] of Object.entries(entities)) {
    text = text.split(entity).join(replacement);
  }
  text = text.replace(/&#(\d+);/g, (match, dec) => {
    try {
      const code = parseInt(dec, 10);
      return (code > 31 && code < 127) ? String.fromCharCode(code) : ' ';
    } catch {
      return ' ';
    }
  });
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

function cleanWikipediaArtifacts(text) {
  return text
    .replace(/Jump to (navigation|search|content)/gi, '')
    .replace(/From Wikipedia, the free encyclopedia/gi, '')
    .replace(/\[edit\]/gi, '')
    .replace(/\[citation needed\]/gi, '')
    .replace(/\[clarification needed\]/gi, '')
    .replace(/\[when\?\]/gi, '')
    .replace(/\[who\?\]/gi, '')
    .replace(/\[\d+\]/g, '')
    .replace(/\[[\d,\s]+\]/g, '')
    .replace(/^\s*\^.*/gm, '')
    .replace(/\s*Main article:\s*[^\n.]*/gi, '')
    .replace(/\s*See also:\s*[^\n.]*/gi, '');
}

function cleanUrls(text) {
  return text
    .replace(/https?:\/\/[^\s)]+/g, ' ')
    .replace(/www\.[^\s)]+/g, ' ')
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, ' ');
}

function cleanCodeBlocks(text) {
  return text
    .replace(/```[\w]*\n?[\s\S]*?\n?```/g, ' [code block] ')
    .replace(/`[^`\n]+`/g, ' ')
    .replace(/\n {4,}.+/g, '');
}

function cleanInlineMath(text) {
  return text
    .replace(/\$\$[\s\S]*?\$\$/g, ' [equation] ')
    .replace(/\$[^$\n]{1,200}\$/g, ' [equation] ')
    .replace(/\\\([\s\S]*?\\\)/g, ' [equation] ')
    .replace(/\\\[[\s\S]*?\\\]/g, ' [equation] ');
}

function cleanScientificText(text) {
  text = text.replace(/\{\\displaystyle[\s\S]*?\}/g, ' [equation] ');
  text = text.replace(/\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g, ' [equation] ');
  text = text.replace(/\\[a-zA-Z]+(\[[^\]]*\])?(\{[^}]*\})?/g, ' ');
  
  let prevText;
  let iterations = 0;
  do {
    prevText = text;
    text = text.replace(/\{[^{}]*\\[a-zA-Z]+[^{}]*\}/g, ' [math] ');
    text = text.replace(/\{[^{}]*\}/g, ' ');
    iterations++;
  } while (prevText !== text && iterations < 5);
  
  text = text.replace(/\\[a-zA-Z]+/g, '');
  text = text.replace(/\\/g, '');
  
  const lines = text.split('\n');
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.length < 3) return false;
    const textOnly = trimmed.replace(/\[(equation|math|code|link|email)\]/gi, '');
    const words = (textOnly.match(/\b[a-zA-Z]{2,}\b/g) || []);
    if (words.length === 0 && textOnly.length > 0) return false;
    const letters = (textOnly.match(/[a-zA-Z]/g) || []).length;
    const ratio = textOnly.length > 0 ? letters / textOnly.length : 0;
    if (ratio < 0.25 && textOnly.length > 15) return false;
    if (trimmed.match(/\[equation\]/g)?.length > 4) return false;
    return true;
  });
  
  return cleanedLines.join('\n');
}

function normalizeUnicodeMath(text) {
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

  for (const [math, normal] of Object.entries(mathAlphanumeric)) {
    text = text.split(math).join(normal);
  }

  text = text.replace(/([0-9.]+)([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾]+)/g, (match, base, superscripts) => {
    const superMap = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')' };
    const converted = superscripts.split('').map(c => superMap[c] || c).join('');
    return ` + base + '^' + converted + `;
  });
  
  text = text.replace(/([a-zA-Z0-9.]+)([₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+)/g, (match, base, subscripts) => {
    const subMap = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', '₊': '+', '₋': '-', '₌': '=', '₍': '(', '₎': ')' };
    const converted = subscripts.split('').map(c => subMap[c] || c).join('');
    return ` + base + '_' + converted + `;
  });
  
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
  
  for (const [unicode, replacement] of Object.entries(mathMap)) {
    text = text.split(unicode).join(replacement);
  }
  
  return text;
}

function cleanEquationFragments(text) {
  // Fix math italic letters
  text = text.replace(/ℎ/g, 'h').replace(/ℓ/g, 'l').replace(/ℯ/g, 'e');
  
  // Fix subscript spacing
  text = text
    .replace(/\b([a-z]+)\s+i\s+j\b/g, '$1_ij')
    .replace(/\bi\s+t\s+h\b/g, 'ith')
    .replace(/\bj\s+t\s+h\b/g, 'jth');
  
  // PATTERN 0: 7+ spaced single letters
  text = text.replace(/\b([a-z]\s+){7,}[a-z]/gi, ' [equation] ');
  
  // PATTERN 1: Equations with Greek letter names
  text = text.replace(/\b[a-z]\s+[a-z][^=]{0,40}?=\s*[^.;]{0,80}?\b(rho|mu|nu|tau|sigma|kappa|lambda|delta|epsilon|theta|phi|psi|omega|alpha|beta|gamma)\b[^.;]{0,80}/gi, ' [equation] ');
  
  // PATTERN 2: Equations with many spaced variables
  text = text.replace(/\b[a-z]+\s*=\s*-?\s*[a-z]+(\s+[a-z]){3,}/gi, ' [equation] ');
  
  // PATTERN 3: Equations with subscripts - FIXED: removed extra opening paren
  text = text.replace(/\b[a-z]+_[ij]+\s*=\s*[a-z]+\s*\([^)]{10,}\)/gi, ' [equation] ');
  
  // PATTERN 4: Long parenthetical with many spaced letters - FIXED: removed unnecessary capture groups
  text = text.replace(/\([^)]*?(\s+[a-z]){6,}[^)]*?\)/gi, ' ');
  
  // PATTERN 5: Sequences of 5-6 spaced letters
  text = text.replace(/\b([a-z]\s+){5,6}[a-z]\b/gi, ' ');
  
  // Remove "where X is Y" definitions
  text = text.replace(/\s+where\s+[a-z_]+\s+is\s+the\s+[^.]+?\./gi, '.');
  
  // SMART DETECTION: For remaining equations with =
  const equationPattern = /\b[a-zA-Z][a-zA-Z0-9_/\s()\[\]]*\s*=\s*[^.;!?\n]{1,150}/g;
  
  text = text.replace(equationPattern, (match) => {
    const trimmed = match.trim();
    const singleLetters = (trimmed.match(/\b[a-z]\b/gi) || []).length;
    const length = trimmed.length;
    const spaces = (trimmed.match(/\s/g) || []).length;
    const hasGreek = /(rho|mu|nu|tau|sigma|alpha|beta|gamma|delta|theta|lambda|phi|omega|kappa|epsilon)/i.test(trimmed);
    const hasSubscript = /_/.test(trimmed);
    const hasMultipleSpacedVars = /(\s+[a-z]){4,}/i.test(trimmed);
    
    // KEEP simple equations
    if (length < 30 && singleLetters <= 5 && spaces < 10 && !hasGreek && !hasSubscript && !hasMultipleSpacedVars) {
      return trimmed.replace(/\s+/g, ' ');
    }
    
    return ' [equation] ';
  });
  
  // Remove orphaned symbols
  text = text.replace(/[⋅·×∇∂]/g, ' ').replace(/−/g, '-');
  
  // Final cleanup - FIXED: corrected the dot escaping
  text = text
    .replace(/\s{2,}/g, ' ')
    .replace(/\[equation\]\s*[.,]?\s*\[equation\]/g, '[equation]')
    .replace(/\s+\[equation\]\s+/g, ' [equation] ')
    .replace(/\.\s*\[equation\]\s*\./g, '.');
  
  return text;
}

function cleanTableArtifacts(text) {
  const lines = text.split('\n');
  const cleaned = lines.filter(line => {
    const trimmed = line.trim();
    if (/^[\s\-=|:+]+$/.test(trimmed)) return false;
    const pipeCount = (trimmed.match(/\|/g) || []).length;
    if (pipeCount > 3) {
      const formattingChars = (trimmed.match(/[\-=|:+\s]/g) || []).length;
      if (formattingChars / trimmed.length > 0.7) return false;
    }
    return true;
  });
  return cleaned.join('\n').replace(/\|/g, ' ').replace(/\+/g, ' ');
}

function removeEmoji(text) {
  return text.replace(/[\u{1F600}-\u{1F64F}]/gu, '').replace(/[\u{1F300}-\u{1F5FF}]/gu, '').replace(/[\u{1F680}-\u{1F6FF}]/gu, '').replace(/[\u{1F700}-\u{1F77F}]/gu, '').replace(/[\u{1F780}-\u{1F7FF}]/gu, '').replace(/[\u{1F800}-\u{1F8FF}]/gu, '').replace(/[\u{1F900}-\u{1F9FF}]/gu, '').replace(/[\u{1FA00}-\u{1FA6F}]/gu, '').replace(/[\u{1FA70}-\u{1FAFF}]/gu, '').replace(/[\u{2600}-\u{26FF}]/gu, '').replace(/[\u{2700}-\u{27BF}]/gu, '');
}

function escapeForJson(text) {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/\0/g, '');
}

function validateCleanedText(text, minWords = 10) {
  const words = (text.match(/\b[a-zA-Z]{2,}\b/g) || []);
  const wordCount = words.length;
  const placeholders = (text.match(/\[(equation|math|code|link|email)\]/gi) || []);
  const placeholderCount = placeholders.length;
  const result = { valid: true, wordCount, placeholderCount, warnings: [] };
  if (wordCount < minWords) {
    result.valid = false;
    result.warnings.push(` + 'Insufficient words: ' + wordCount + ' < ' + minWords + `);
  }
  if (wordCount > 0 && placeholderCount / wordCount > 0.5) {
    result.warnings.push(` + 'High placeholder ratio: ' + placeholderCount + '/' + wordCount + `);
  }
  if (text.trim().length < 50) {
    result.valid = false;
    result.warnings.push('Cleaned text too short');
  }
  return result;
}

export function cleanSelectionText(text, options = {}) {
  const { maxLength = 5000, minWords = 10, aggressiveUnicode = false, preserveEquations = false, silent = false } = options;
  if (!text || typeof text !== 'string') return '';
  const originalLength = text.length;
  let cleaned = text;
  try {
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
    if (aggressiveUnicode) cleaned = cleaned.replace(/[^\x00-\x7F]/g, '');
    cleaned = cleanToPromptReady(cleaned);
    
    if (cleaned.length > maxLength) {
      const truncated = cleaned.substring(0, maxLength);
      const lastPeriod = truncated.lastIndexOf('.');
      const lastNewline = truncated.lastIndexOf('\n');
      const cutPoint = Math.max(lastPeriod, lastNewline);
      cleaned = cutPoint > maxLength * 0.8 ? truncated.substring(0, cutPoint + 1) : truncated + '...';
    }
    
    const validation = validateCleanedText(cleaned, minWords);
    if (!validation.valid) {
      if (!silent) console.warn('[cleanSelectionText] Validation failed:', validation.warnings);
      return normalizeWhitespace(text.substring(0, maxLength));
    }
    if (!silent && validation.warnings.length > 0) console.info('[cleanSelectionText] Warnings:', validation.warnings);
    if (!silent) {
      const reduction = ((1 - cleaned.length / originalLength) * 100).toFixed(1);
      console.info(` + '[cleanSelectionText] Cleaned: ' + reduction + '% reduction (' + originalLength + ' → ' + cleaned.length + ' chars)' + `);
    }
    return cleaned;
  } catch (error) {
    if (!silent) console.error('[cleanSelectionText] Error:', error.message);
    return normalizeWhitespace(text.substring(0, maxLength));
  }
}

export const __testing__ = { removeInvisibleChars, cleanHtmlArtifacts, cleanWikipediaArtifacts, cleanUrls, cleanInlineMath, cleanScientificText, cleanEquationFragments, normalizeUnicodeMath, cleanCodeBlocks, cleanTableArtifacts, removeEmoji, escapeForJson, validateCleanedText };

export function analyzeCleaningImpact(originalText, cleanedText) {
  return {
    original: { length: originalText.length, lines: originalText.split('\n').length, words: (originalText.match(/\b\w+\b/g) || []).length },
    cleaned: { length: cleanedText.length, lines: cleanedText.split('\n').length, words: (cleanedText.match(/\b\w+\b/g) || []).length },
    removed: { length: originalText.length - cleanedText.length, percentage: ((1 - cleanedText.length / originalText.length) * 100).toFixed(1) },
    placeholders: { equations: (cleanedText.match(/\[equation\]/g) || []).length, math: (cleanedText.match(/\[math\]/g) || []).length, code: (cleanedText.match(/\[code/g) || []).length, links: (cleanedText.match(/\[link\]/g) || []).length }
  };
}

export function debugCleaningSteps(text) {
  const steps = {};
  steps.original = text;
  steps.afterInvisible = removeInvisibleChars(text);
  steps.afterHtml = cleanHtmlArtifacts(steps.afterInvisible);
  steps.afterUrls = cleanUrls(steps.afterHtml);
  steps.afterCode = cleanCodeBlocks(steps.afterUrls);
  steps.afterTables = cleanTableArtifacts(steps.afterCode);
  steps.afterWikipedia = cleanWikipediaArtifacts(steps.afterTables);
  steps.afterInlineMath = cleanInlineMath(steps.afterWikipedia);
  steps.afterScientific = cleanScientificText(steps.afterInlineMath);
  steps.afterUnicodeMath = normalizeUnicodeMath(steps.afterScientific);
  steps.afterEquationFragments = cleanEquationFragments(steps.afterUnicodeMath);
  steps.afterEmoji = removeEmoji(steps.afterEquationFragments);
  steps.afterJson = escapeForJson(steps.afterEmoji);
  steps.final = cleanToPromptReady(steps.afterJson);
  return steps;
}

export default cleanSelectionText;