/**
 * @fileoverview Data normalizer for robust quiz data validation and transformation.
 * 
 * This module provides comprehensive data normalization and validation utilities
 * for quiz data structures. It ensures data integrity by:
 * 
 * - Converting various data types to expected formats
 * - Validating quiz and question structures
 * - Sanitizing content to remove unsafe elements
 * - Handling malformed data gracefully with fallback structures
 * - Providing detailed error reporting for debugging
 * 
 * The normalizer is essential for processing data from diverse sources including
 * AI models, APIs, and user inputs, ensuring consistent and safe data throughout
 * the application.
 * 
 * @module dataNormalizer
 */

import { sanitizeQuestion, validateQuestionStructure } from './questionValidator';

/**
 * Normalizes various types to string safely.
 * 
 * Handles conversion of different value types to clean strings,
 * including nested objects with text/value properties, null/undefined
 * values, and complex objects with JSON serialization fallback.
 * 
 * @param {*} value - Value to normalize to string
 * @returns {string} Normalized string value
 * 
 * @example
 * const str1 = normalizeString('  hello  '); // 'hello'
 * const str2 = normalizeString({ text: 'world' }); // 'world'
 * const str3 = normalizeString(null); // ''
 * const str4 = normalizeString(42); // '42'
 */
function normalizeString(value) {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value && typeof value === 'object') {
    if (value.text) return normalizeString(value.text);
    if (value.value) return normalizeString(value.value);
    // Avoid circular references
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/**
 * Creates an empty/error quiz structure.
 * 
 * Generates a fallback quiz structure when data normalization
 * fails completely. Provides a user-friendly error state rather
 * than crashing the application.
 * 
 * @param {string} [errorMessage='Invalid quiz data'] - Error message to include
 * @returns {Object} Error quiz structure with safe defaults
 * 
 * @example
 * const errorQuiz = createEmptyQuiz('Failed to load quiz data');
 * console.log(errorQuiz.title); // 'Error Loading Quiz'
 */
function createEmptyQuiz(errorMessage = 'Invalid quiz data') {
  return {
    id: `error_quiz_${Date.now()}`,
    title: 'Error Loading Quiz',
    subject: 'Unknown',
    questions: [],
    totalQuestions: 0,
    config: {
      immediateFeedback: true,
      timerEnabled: false,
      totalTimer: 600,
      questionTimer: 0,
    },
    error: errorMessage,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Normalizes quiz configuration.
 * 
 * Ensures quiz configuration has all required fields with proper
 * data types and sensible defaults. Handles missing or malformed
 * configuration objects gracefully.
 * 
 * @param {Object} config - Raw configuration object
 * @returns {Object} Normalized configuration with defaults
 * 
 * @example
 * const rawConfig = { immediateFeedback: false };
 * const normalized = normalizeConfig(rawConfig);
 * console.log(normalized.timerEnabled); // true (default)
 */
function normalizeConfig(config) {
  if (!config || typeof config !== 'object') {
    return {
      immediateFeedback: true,
      timerEnabled: true,
      totalTimer: 600,
      questionTimer: 0,
      difficulty: 'medium',
      subject: 'General',
    };
  }

  return {
    immediateFeedback:
      typeof config.immediateFeedback === 'boolean' ? config.immediateFeedback : true,
    timerEnabled: typeof config.timerEnabled === 'boolean' ? config.timerEnabled : true,
    totalTimer:
      typeof config.totalTimer === 'number' && config.totalTimer > 0 ? config.totalTimer : 600,
    questionTimer:
      typeof config.questionTimer === 'number' && config.questionTimer >= 0
        ? config.questionTimer
        : 0,
    difficulty: typeof config.difficulty === 'string' ? config.difficulty : 'medium',
    subject: typeof config.subject === 'string' ? config.subject : 'General',
  };
}

/**
 * Main function to normalize quiz data.
 * 
 * Performs comprehensive normalization of quiz data including:
 * - Input validation and type checking
 * - Deep cloning to prevent mutation of original data
 * - Field normalization for basic properties
 * - Configuration normalization with defaults
 * - Question validation and sanitization
 * - Error handling with fallback structures
 * 
 * @param {Object} quizData - Raw quiz data from API or AI
 * @returns {Object} Normalized quiz data or error quiz
 * 
 * @example
 * const rawData = {\n *   title: '  Math Quiz  ',\n *   questions: [\n *     {\n *       type: 'MCQ',\n *       question: 'What is 2+2?',\n *       options: [\n *         { text: '3', isCorrect: false },\n *         { text: '4', isCorrect: true }\n *       ]\n *     }\n *   ]\n * };\n * \n * const normalized = normalizeQuizData(rawData);\n * console.log(normalized.title); // 'Math Quiz' (trimmed)
 */
export function normalizeQuizData(quizData) {
  // Validate input is an object
  if (!quizData || typeof quizData !== 'object' || Array.isArray(quizData)) {
    console.error('Invalid quiz data: not an object', quizData);
    return createEmptyQuiz('Quiz data is not a valid object');
  }

  // Validate questions array exists
  if (!Array.isArray(quizData.questions)) {
    console.error('Invalid quiz data: questions is not an array', quizData);
    return createEmptyQuiz('Questions data is missing or invalid');
  }

  if (quizData.questions.length === 0) {
    console.error('Invalid quiz data: questions array is empty');
    return createEmptyQuiz('Quiz has no questions');
  }

  // Create deep clone to avoid mutating original data
  let normalized;
  try {
    normalized = JSON.parse(JSON.stringify(quizData));
  } catch (e) {
    console.error('Failed to clone quiz data:', e);
    // Fallback to shallow copy
    normalized = { ...quizData };
  }

  // Normalize basic fields
  normalized.id = quizData.id || `quiz_${Date.now()}`;
  normalized.title = normalizeString(quizData.title) || 'Untitled Quiz';
  normalized.subject = normalizeString(quizData.subject) || 'General';
  normalized.createdAt = quizData.createdAt || new Date().toISOString();

  // Normalize config
  normalized.config = normalizeConfig(quizData.config);

  // Normalize questions with validation
  const normalizedQuestions = [];
  const errors = [];

  normalized.questions.forEach((question, index) => {
    try {
      // Validate question structure
      const validation = validateQuestionStructure(question);

      if (validation.valid) {
        // Sanitize the question
        const sanitized = sanitizeQuestion(question, index);
        if (sanitized) {
          normalizedQuestions.push(sanitized);

          // Log warnings if any
          if (validation.warnings.length > 0) {
            console.warn(`Question ${index + 1} warnings:`, validation.warnings);
          }
        } else {
          errors.push(`Question ${index + 1}: Failed to sanitize`);
          console.error(`Failed to sanitize question ${index + 1}:`, question);
        }
      } else {
        // Try to sanitize anyway - might be fixable
        const sanitized = sanitizeQuestion(question, index);
        if (sanitized) {
          normalizedQuestions.push(sanitized);
          console.warn(`Question ${index + 1} had errors but was recovered:`, validation.errors);
        } else {
          errors.push(`Question ${index + 1}: ${validation.errors.join(', ')}`);
          console.error(`Question ${index + 1} validation failed:`, validation.errors, question);
        }
      }
    } catch (err) {
      errors.push(`Question ${index + 1}: Exception - ${err.message}`);
      console.error(`Exception normalizing question ${index + 1}:`, err, question);
    }
  });

  // Update with normalized questions
  normalized.questions = normalizedQuestions;
  normalized.totalQuestions = normalizedQuestions.length;

  // If no valid questions, return error quiz
  if (normalizedQuestions.length === 0) {
    console.error('No valid questions after normalization. Errors:', errors);
    return createEmptyQuiz(`All questions failed validation. ${errors.length} error(s) found.`);
  }

  // Log if some questions were filtered out
  if (normalizedQuestions.length < quizData.questions.length) {
    const filtered = quizData.questions.length - normalizedQuestions.length;
    console.warn(`${filtered} question(s) were filtered out due to validation errors`);
  }

  // Add time limit if not present
  if (typeof normalized.timeLimit !== 'number') {
    normalized.timeLimit = normalized.config.totalTimer || 600;
  }

  return normalized;
}

/**
 * Validates that normalized quiz data is ready for use.
 * 
 * Performs final validation checks on normalized quiz data to
 * ensure it meets all requirements for application use. Checks
 * for error states, valid question arrays, and consistent counts.
 * 
 * @param {Object} quiz - Normalized quiz data to validate
 * @returns {Object} Validation result with valid flag and error message
 * @property {boolean} valid - Whether the quiz is valid
 * @property {string} [error] - Error message if invalid
 * 
 * @example
 * const quiz = normalizeQuizData(rawData);\n * const validation = validateNormalizedQuiz(quiz);\n * if (validation.valid) {\n *   console.log('Quiz is ready for use');\n * } else {\n *   console.error('Validation failed:', validation.error);\n * }
 */
export function validateNormalizedQuiz(quiz) {
  if (!quiz || typeof quiz !== 'object') {
    return { valid: false, error: 'Quiz is not an object' };
  }

  if (quiz.error) {
    return { valid: false, error: quiz.error };
  }

  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    return { valid: false, error: 'Quiz has no valid questions' };
  }

  if (typeof quiz.totalQuestions !== 'number' || quiz.totalQuestions !== quiz.questions.length) {
    return { valid: false, error: 'Question count mismatch' };
  }

  return { valid: true };
}

/**
 * Normalizes a single question (useful for dynamic updates).
 * 
 * Applies normalization and validation to a single question,
 * useful when dynamically adding or modifying questions. Includes
 * validation warnings and error handling with null fallback.
 * 
 * @param {Object} question - Raw question data to normalize
 * @param {number} [index=0] - Question index for logging context
 * @returns {Object|null} Normalized question or null if invalid
 * 
 * @example
 * const rawQuestion = {\n *   type: 'MCQ',\n *   question: 'What is 2+2?',\n *   options: [\n *     { text: '3', isCorrect: false },\n *     { text: '4', isCorrect: true }\n *   ]\n * };\n * \n * const normalized = normalizeSingleQuestion(rawQuestion, 0);\n * if (normalized) {\n *   console.log('Question is valid');\n * } else {\n *   console.error('Question is invalid');\n * }
 */
export function normalizeSingleQuestion(question, index = 0) {
  try {
    const validation = validateQuestionStructure(question);

    if (!validation.valid && validation.errors.length > 0) {
      console.warn(`Question validation warnings:`, validation.errors);
    }

    const sanitized = sanitizeQuestion(question, index);

    if (!sanitized) {
      throw new Error('Failed to sanitize question');
    }

    return sanitized;
  } catch (err) {
    console.error('Failed to normalize question:', err, question);
    return null;
  }
}
