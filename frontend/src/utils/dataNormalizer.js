/**
 * Data Normalizer
 * Provides robust normalization and validation for quiz data
 */

import { sanitizeQuestion, validateQuestionStructure } from './questionValidator';

/**
 * Normalizes various types to string safely
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
 * Creates an empty/error quiz structure
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
      questionTimer: 0
    },
    error: errorMessage,
    createdAt: new Date().toISOString()
  };
}

/**
 * Normalizes quiz configuration
 */
function normalizeConfig(config) {
  if (!config || typeof config !== 'object') {
    return {
      immediateFeedback: true,
      timerEnabled: true,
      totalTimer: 600,
      questionTimer: 0,
      difficulty: 'medium',
      subject: 'General'
    };
  }

  return {
    immediateFeedback: typeof config.immediateFeedback === 'boolean' 
      ? config.immediateFeedback 
      : true,
    timerEnabled: typeof config.timerEnabled === 'boolean' 
      ? config.timerEnabled 
      : true,
    totalTimer: typeof config.totalTimer === 'number' && config.totalTimer > 0
      ? config.totalTimer 
      : 600,
    questionTimer: typeof config.questionTimer === 'number' && config.questionTimer >= 0
      ? config.questionTimer 
      : 0,
    difficulty: typeof config.difficulty === 'string' 
      ? config.difficulty 
      : 'medium',
    subject: typeof config.subject === 'string' 
      ? config.subject 
      : 'General'
  };
}

/**
 * Main function to normalize quiz data
 * @param {Object} quizData - Raw quiz data from API or AI
 * @returns {Object} Normalized quiz data or error quiz
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
 * Validates that normalized quiz data is ready for use
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
 * Normalizes a single question (useful for dynamic updates)
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