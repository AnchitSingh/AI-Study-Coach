// src/utils/helpers.js

/**
 * Generate unique identifiers for quizzes, questions, and other entities
 */

// Simple ID generator using timestamp + random component
export function generateId(prefix = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

// Generate short IDs for questions (easier to debug)
export function generateQuestionId(index) {
    const timestamp = Date.now().toString(36);
    return `q${index + 1}_${timestamp}`;
}

// Generate quiz-specific IDs
export function generateQuizId() {
    return generateId('quiz');
}

// Generate session/progress IDs
export function generateSessionId() {
    return generateId('session');
}

// Generate bookmark IDs
export function generateBookmarkId() {
    return generateId('bookmark');
}


/**
 * UUID v4 generator (more robust for production)
 * Use this for critical entities that need guaranteed uniqueness
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Crypto-based ID generation (if available)
 * Falls back to timestamp-based generation
 */
export function generateSecureId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint32Array(4);
        crypto.getRandomValues(array);
        return Array.from(array, dec => dec.toString(16)).join('');
    }

    // Fallback to timestamp + random
    return generateId();
}

/**
 * Short readable IDs for user-facing elements
 */
export function generateReadableId() {
    const adjectives = [
        'quick', 'bright', 'smart', 'clever', 'swift', 'sharp', 'keen',
        'bold', 'wise', 'fast', 'clear', 'strong', 'fresh', 'cool'
    ];

    const nouns = [
        'quiz', 'test', 'study', 'learn', 'brain', 'mind', 'think',
        'solve', 'know', 'fact', 'idea', 'logic', 'skill', 'focus'
    ];

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 1000);

    return `${adj}-${noun}-${num}`;
}

/**
 * Time-based utilities
 */
export function getCurrentTimestamp() {
    return new Date().toISOString();
}

export function getTimestampId() {
    return Date.now().toString();
}

/**
 * Validation utilities
 */
export function isValidId(id) {
    return typeof id === 'string' && id.length > 0 && /^[a-zA-Z0-9_-]+$/.test(id);
}

export function sanitizeId(str) {
    if (!str) return generateId();
    return str.toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substr(0, 50) || generateId();
}

/**
 * Subject/topic detection utilities
 */
export function extractSubject(topic) {
    if (!topic) return 'General';

    const subjectKeywords = {
        'Physics': ['physics', 'mechanics', 'thermodynamics', 'electricity', 'magnetism', 'quantum', 'newton'],
        'Mathematics': ['math', 'calculus', 'algebra', 'geometry', 'statistics', 'trigonometry', 'derivative'],
        'Chemistry': ['chemistry', 'organic', 'inorganic', 'biochemistry', 'molecule', 'reaction', 'atom'],
        'Biology': ['biology', 'anatomy', 'genetics', 'ecology', 'cell', 'organism', 'photosynthesis'],
        'Computer Science': ['programming', 'javascript', 'python', 'algorithm', 'data structure', 'software'],
        'History': ['history', 'war', 'civilization', 'ancient', 'medieval', 'empire', 'revolution'],
        'Geography': ['geography', 'climate', 'continent', 'country', 'mountain', 'ocean', 'capital']
    };

    const lowerTopic = topic.toLowerCase();

    for (const [subject, keywords] of Object.entries(subjectKeywords)) {
        if (keywords.some(keyword => lowerTopic.includes(keyword))) {
            return subject;
        }
    }

    return 'General';
}

/**
 * Text processing utilities
 */
export function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
}

export function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s.,!?-]/g, '')
        .trim();
}

/**
 * Array utilities
 */
export function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function getRandomItems(array, count) {
    const shuffled = shuffleArray(array);
    return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Storage utilities
 */
export function safeJSONParse(jsonString, fallback = null) {
    try {
        return JSON.parse(jsonString);
    } catch {
        return fallback;
    }
}

export function safeJSONStringify(obj, fallback = '{}') {
    try {
        return JSON.stringify(obj);
    } catch {
        return fallback;
    }
}

/**
 * Performance utilities
 */
export function createTimer() {
    const startTime = performance.now();
    return {
        elapsed: () => Math.round(performance.now() - startTime),
        stop: () => {
            const elapsed = Math.round(performance.now() - startTime);
            
            return elapsed;
        }
    };
}

/**
 * Debug utilities
 */
export function logWithPrefix(prefix, ...args) {
    
}

export function createLogger(prefix) {
    return {
        log: (...args) => console.log(`[${prefix}]`, ...args),
        error: (...args) => console.error(`[${prefix}]`, ...args),
        warn: (...args) => console.warn(`[${prefix}]`, ...args),
        info: (...args) => console.info(`[${prefix}]`, ...args)
    };
}

/**
 * Default export with commonly used functions
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
    createLogger
};
