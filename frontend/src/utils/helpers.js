/**
 * @fileoverview Utility functions for generating IDs, text processing, and general helpers.
 * 
 * This module provides a comprehensive set of utility functions for common
 * operations throughout the AI Study Coach application. It includes ID generation
 * utilities for creating unique identifiers, text processing functions for
 * cleaning and formatting content, subject detection for categorization,
 * array manipulation utilities, and debugging tools.
 * 
 * The ID generation utilities offer multiple approaches from simple timestamp-based
 * IDs to cryptographically secure UUIDs, allowing developers to choose the
 * appropriate level of uniqueness and security for different use cases.
 * 
 * @module helpers
 */

// src/utils/helpers.js

// ============================================================================
// ID GENERATION
// ============================================================================

/**
 * Generate unique identifiers for quizzes, questions, and other entities.
 * 
 * @namespace idGeneration
 */

/**
 * Simple ID generator using timestamp + random component.
 * 
 * @param {string} [prefix=''] - Optional prefix for the ID
 * @returns {string} Unique identifier in format "{prefix_}{timestamp}_{random}"
 * 
 * @example
 * const id1 = generateId(); // "1701234567890_a1b2c3d4e5f"
 * const id2 = generateId('quiz'); // "quiz_1701234567890_a1b2c3d4e5f"
 */
export function generateId(prefix = '') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Generate short IDs for questions (easier to debug).
 * 
 * @param {number} index - Question index (0-based)
 * @returns {string} Short question identifier in format "q{index+1}_{timestamp}"
 * 
 * @example
 * const questionId = generateQuestionId(0); // "q1_abc123def"
 */
export function generateQuestionId(index) {
  const timestamp = Date.now().toString(36);
  return `q${index + 1}_${timestamp}`;
}

/**
 * Generate quiz-specific IDs.
 * 
 * @returns {string} Quiz identifier with "quiz_" prefix
 * 
 * @example
 * const quizId = generateQuizId(); // "quiz_1701234567890_a1b2c3d4e5f"
 */
export function generateQuizId() {
  return generateId('quiz');
}

/**
 * Generate session/progress IDs.
 * 
 * @returns {string} Session identifier with "session_" prefix
 * 
 * @example
 * const sessionId = generateSessionId(); // "session_1701234567890_a1b2c3d4e5f"
 */
export function generateSessionId() {
  return generateId('session');
}

/**
 * Generate bookmark IDs.
 * 
 * @returns {string} Bookmark identifier with "bookmark_" prefix
 * 
 * @example
 * const bookmarkId = generateBookmarkId(); // "bookmark_1701234567890_a1b2c3d4e5f"
 */
export function generateBookmarkId() {
  return generateId('bookmark');
}

/**
 * UUID v4 generator (more robust for production).
 * 
 * Use this for critical entities that need guaranteed uniqueness.
 * Generates standard UUID v4 format with 32 hexadecimal digits.
 * 
 * @returns {string} UUID v4 formatted identifier
 * 
 * @example
 * const uuid = generateUUID(); // "550e8400-e29b-41d4-a716-446655440000"
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Crypto-based ID generation (if available).
 * 
 * Uses browser's crypto API for cryptographically secure random values
 * when available, falling back to timestamp-based generation.
 * 
 * @returns {string} Cryptographically secure ID or timestamp-based fallback
 * 
 * @example
 * const secureId = generateSecureId(); // "a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8"
 */
export function generateSecureId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, (dec) => dec.toString(16)).join('');
  }

  // Fallback to timestamp + random
  return generateId();
}

/**
 * Short readable IDs for user-facing elements.
 * 
 * Generates human-friendly IDs using adjective-noun combinations
 * with a random number for uniqueness. Useful for temporary
 * identifiers that users might see.
 * 
 * @returns {string} Readable identifier in format "{adjective}-{noun}-{number}"
 * 
 * @example
 * const readableId = generateReadableId(); // "smart-quiz-42"
 */
export function generateReadableId() {
  const adjectives = [
    'quick',
    'bright',
    'smart',
    'clever',
    'swift',
    'sharp',
    'keen',
    'bold',
    'wise',
    'fast',
    'clear',
    'strong',
    'fresh',
    'cool',
  ];

  const nouns = [
    'quiz',
    'test',
    'study',
    'learn',
    'brain',
    'mind',
    'think',
    'solve',
    'know',
    'fact',
    'idea',
    'logic',
    'skill',
    'focus',
  ];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);

  return `${adj}-${noun}-${num}`;
}

// ============================================================================
// TIME UTILITIES
// ============================================================================

/**
 * Time-based utilities.
 * 
 * @namespace timeUtilities
 */

/**
 * Get current timestamp in ISO format.
 * 
 * @returns {string} Current timestamp in ISO 8601 format
 * 
 * @example
 * const timestamp = getCurrentTimestamp(); // "2023-12-01T10:30:45.123Z"
 */
export function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Get timestamp as string representation.
 * 
 * @returns {string} Current timestamp as string
 * 
 * @example
 * const timestampId = getTimestampId(); // "1701234567890"
 */
export function getTimestampId() {
  return Date.now().toString();
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validation utilities.
 * 
 * @namespace validationUtilities
 */

/**
 * Check if an ID is valid.
 * 
 * @param {string} id - ID to validate
 * @returns {boolean} Whether the ID is valid
 * 
 * @example
 * const isValid = isValidId('quiz_123'); // true
 * const isInvalid = isValidId(''); // false
 */
export function isValidId(id) {
  return typeof id === 'string' && id.length > 0 && /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Sanitize a string to create a valid ID.
 * 
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized ID string or generated ID if invalid
 * 
 * @example
 * const cleanId = sanitizeId('My Invalid ID!'); // "my_invalid_id"
 */
export function sanitizeId(str) {
  if (!str) return generateId();
  return (
    str
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substr(0, 50) || generateId()
  );
}

// ============================================================================
// SUBJECT/TOPIC UTILITIES
// ============================================================================

/**
 * Subject/topic detection utilities.
 * 
 * @namespace subjectDetection
 */

/**
 * Extract subject from topic text.
 * 
 * @param {string} topic - Topic text to analyze
 * @returns {string} Detected subject or 'General' if none found
 * 
 * @example
 * const subject = extractSubject('Introduction to Quantum Physics'); // "Physics"
 * const general = extractSubject('Random Topic'); // "General"
 */
export function extractSubject(topic) {
  if (!topic) return 'General';

  const subjectKeywords = {
    Physics: [
      'physics',
      'mechanics',
      'thermodynamics',
      'electricity',
      'magnetism',
      'quantum',
      'newton',
    ],
    Mathematics: [
      'math',
      'calculus',
      'algebra',
      'geometry',
      'statistics',
      'trigonometry',
      'derivative',
    ],
    Chemistry: [
      'chemistry',
      'organic',
      'inorganic',
      'biochemistry',
      'molecule',
      'reaction',
      'atom',
    ],
    Biology: ['biology', 'anatomy', 'genetics', 'ecology', 'cell', 'organism', 'photosynthesis'],
    'Computer Science': [
      'programming',
      'javascript',
      'python',
      'algorithm',
      'data structure',
      'software',
    ],
    History: ['history', 'war', 'civilization', 'ancient', 'medieval', 'empire', 'revolution'],
    Geography: ['geography', 'climate', 'continent', 'country', 'mountain', 'ocean', 'capital'],
  };

  const lowerTopic = topic.toLowerCase();

  for (const [subject, keywords] of Object.entries(subjectKeywords)) {
    if (keywords.some((keyword) => lowerTopic.includes(keyword))) {
      return subject;
    }
  }

  return 'General';
}

// ============================================================================
// TEXT PROCESSING UTILITIES
// ============================================================================

/**
 * Text processing utilities.
 * 
 * @namespace textProcessing
 */

/**
 * Truncate text to specified length.
 * 
 * @param {string} text - Text to truncate
 * @param {number} [maxLength=100] - Maximum length before truncation
 * @returns {string} Truncated text with "..." suffix if needed
 * 
 * @example
 * const shortText = truncateText('This is a very long text', 10); // "This is a..."
 */
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Clean text by removing excess whitespace and special characters.
 * 
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 * 
 * @example
 * const clean = cleanText('  Hello!!!   World???  '); // "Hello World"
 */
export function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,!?-]/g, '')
    .trim();
}

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

/**
 * Array utilities.
 * 
 * @namespace arrayUtilities
 */

/**
 * Shuffle array elements randomly.
 * 
 * @param {Array} array - Array to shuffle
 * @returns {Array} New shuffled array
 * 
 * @example
 * const shuffled = shuffleArray([1, 2, 3, 4, 5]); // [3, 1, 5, 2, 4]
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get random items from array.
 * 
 * @param {Array} array - Source array
 * @param {number} count - Number of items to get
 * @returns {Array} Array of random items
 * 
 * @example
 * const randomItems = getRandomItems([1, 2, 3, 4, 5], 3); // [4, 1, 3]
 */
export function getRandomItems(array, count) {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, Math.min(count, array.length));
}

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

/**
 * Storage utilities.
 * 
 * @namespace storageUtilities
 */

/**
 * Safely parse JSON string.
 * 
 * @param {string} jsonString - JSON string to parse
 * @param {*} [fallback=null] - Fallback value if parsing fails
 * @returns {*} Parsed JSON or fallback value
 * 
 * @example
 * const data = safeJSONParse('{"key": "value"}'); // {key: "value"}
 * const fallback = safeJSONParse('invalid', {}); // {}
 */
export function safeJSONParse(jsonString, fallback = null) {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

/**
 * Safely stringify object to JSON.
 * 
 * @param {*} obj - Object to stringify
 * @param {string} [fallback='{}'] - Fallback string if stringifying fails
 * @returns {string} JSON string or fallback value
 * 
 * @example
 * const json = safeJSONStringify({key: "value"}); // '{"key":"value"}'
 * const fallback = safeJSONStringify(undefined, '""'); // '""'
 */
export function safeJSONStringify(obj, fallback = '{}') {
  try {
    return JSON.stringify(obj);
  } catch {
    return fallback;
  }
}

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

/**
 * Performance utilities.
 * 
 * @namespace performanceUtilities
 */

/**
 * Create a timer for measuring elapsed time.
 * 
 * @returns {Object} Timer object with elapsed() and stop() methods
 * 
 * @example
 * const timer = createTimer();
 * // ... some operation ...
 * const elapsedMs = timer.stop(); // milliseconds elapsed
 */
export function createTimer() {
  const startTime = performance.now();
  return {
    elapsed: () => Math.round(performance.now() - startTime),
    stop: () => {
      const elapsed = Math.round(performance.now() - startTime);

      return elapsed;
    },
  };
}

// ============================================================================
// DEBUG UTILITIES
// ============================================================================

/**
 * Debug utilities.
 * 
 * @namespace debugUtilities
 */

/**
 * Log messages with prefix (currently empty implementation).
 * 
 * @param {string} prefix - Log prefix
 * @param {...any} args - Arguments to log
 */
export function logWithPrefix(prefix, ...args) {}

/**
 * Create a logger with specified prefix.
 * 
 * @param {string} prefix - Prefix for all log messages
 * @returns {Object} Logger object with log methods
 * 
 * @example
 * const logger = createLogger('QuizGenerator');
 * logger.log('Starting quiz generation'); // "[QuizGenerator] Starting quiz generation"
 */
export function createLogger(prefix) {
  return {
    log: (...args) => console.log(`[${prefix}]`, ...args),
    error: (...args) => console.error(`[${prefix}]`, ...args),
    warn: (...args) => console.warn(`[${prefix}]`, ...args),
    info: (...args) => console.info(`[${prefix}]`, ...args),
  };
}

/**
 * Default export with commonly used functions.
 * 
 * @type {Object}
 */
export default {
  generateId,
  generateQuestionId,
  generateQuizId,
  generateSessionId,
  generateUUID,
  generateReadableId,
  extractSubject,
  truncateText,
  shuffleArray,
  getCurrentTimestamp,
  createTimer,
  createLogger,
};
