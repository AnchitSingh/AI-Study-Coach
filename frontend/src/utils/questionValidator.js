/**
 * Question Validator Utility
 * Provides comprehensive validation and sanitization for quiz questions
 */

/**
 * Validates the structure of a question object
 * @param {Object} question - The question object to validate
 * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
 */
export const validateQuestionStructure = (question) => {
  const errors = [];
  const warnings = [];

  // Check if question is an object
  if (!question || typeof question !== 'object' || Array.isArray(question)) {
    return { 
      valid: false, 
      errors: ['Question is not a valid object'], 
      warnings: [] 
    };
  }

  // Validate question text
  if (typeof question.question !== 'string') {
    errors.push('Question text must be a string');
  } else if (!question.question.trim()) {
    errors.push('Question text cannot be empty');
  }

  // Validate question type
  const validTypes = ['MCQ', 'True/False', 'Short Answer', 'Subjective', 'Fill in Blank'];
  if (typeof question.type !== 'string') {
    errors.push('Question type is missing or not a string');
  } else if (!validTypes.includes(question.type)) {
    errors.push(`Invalid question type: "${question.type}". Must be one of: ${validTypes.join(', ')}`);
  }

  // Type-specific validation
  if (question.type === 'MCQ' || question.type === 'True/False') {
    // These are algorithm-evaluated - MUST have proper options structure
    if (!Array.isArray(question.options)) {
      errors.push('Options must be an array for MCQ/True-False questions');
    } else {
      // Validate minimum options
      const minOptions = question.type === 'True/False' ? 2 : 2;
      if (question.options.length < minOptions) {
        errors.push(`Must have at least ${minOptions} options`);
      }

      // Validate each option
      question.options.forEach((option, index) => {
        if (!option || typeof option !== 'object') {
          errors.push(`Option ${index + 1} is not a valid object`);
        } else {
          if (typeof option.text !== 'string' || !option.text.trim()) {
            errors.push(`Option ${index + 1} must have valid text`);
          }
          if (typeof option.isCorrect !== 'boolean') {
            warnings.push(`Option ${index + 1} missing isCorrect flag, defaulting to false`);
          }
        }
      });

      // Validate at least one correct answer
      const hasCorrectAnswer = question.options.some(opt => opt && opt.isCorrect === true);
      if (!hasCorrectAnswer) {
        errors.push('At least one option must be marked as correct');
      }

      // Check for multiple correct answers in True/False
      if (question.type === 'True/False') {
        const correctCount = question.options.filter(opt => opt && opt.isCorrect === true).length;
        if (correctCount > 1) {
          errors.push('True/False questions must have exactly one correct answer');
        }
      }
    }
  }

  if (question.type === 'Fill in Blank') {
    // AI-evaluated - just needs question text with blanks and optional model answer
    if (!question.question || typeof question.question !== 'string') {
      errors.push('Fill in Blank question must have question text');
    } else {
      // Check for blanks in question text
      const blankCount = (question.question.match(/_{3,}/g) || []).length;
      if (blankCount === 0) {
        warnings.push('Fill in Blank question should contain blanks (3+ underscores)');
      }
    }

    // Model answer is helpful but not required (AI can evaluate without it)
    if (!question.answer) {
      warnings.push('Fill in Blank question should have a model answer for better AI evaluation');
    }
  }

  if (question.type === 'Short Answer' || question.type === 'Subjective') {
    // AI-evaluated - just needs question text and optional model answer
    if (!question.answer && !question.explanation) {
      warnings.push('Short Answer question should have a model answer or explanation for better AI evaluation');
    }
  }

  // Validate explanation (recommended but not required)
  if (!question.explanation) {
    warnings.push('Question is missing explanation');
  } else if (typeof question.explanation !== 'string') {
    warnings.push('Explanation should be a string');
  }

  // Validate optional fields
  if (question.difficulty && typeof question.difficulty !== 'string') {
    warnings.push('Difficulty should be a string');
  }

  if (question.subject && typeof question.subject !== 'string') {
    warnings.push('Subject should be a string');
  }

  if (question.tags !== undefined) {
    if (!Array.isArray(question.tags)) {
      warnings.push('Tags should be an array');
    } else {
      const invalidTags = question.tags.filter(tag => typeof tag !== 'string');
      if (invalidTags.length > 0) {
        warnings.push(`${invalidTags.length} tag(s) are not strings`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Sanitizes a question object, applying fixes where possible
 * @param {Object} question - The question to sanitize
 * @param {number} index - Question index for ID generation
 * @returns {Object|null} Sanitized question or null if unfixable
 */
export const sanitizeQuestion = (question, index = 0) => {
  if (!question || typeof question !== 'object') {
    console.error('Cannot sanitize non-object question:', question);
    return null;
  }

  // Start with a clean object
  const sanitized = {};

  // Generate ID if missing
  sanitized.id = question.id || `q_${Date.now()}_${index}`;

  // Sanitize question type
  const validTypes = ['MCQ', 'True/False', 'Short Answer', 'Subjective', 'Fill in Blank'];
  if (validTypes.includes(question.type)) {
    sanitized.type = question.type;
  } else {
    console.warn(`Invalid type "${question.type}", defaulting to MCQ`);
    sanitized.type = 'MCQ';
  }

  // Sanitize question text
  sanitized.question = normalizeToString(question.question);
  if (!sanitized.question) {
    console.error('Question has no valid text, cannot sanitize');
    return null;
  }

  // Sanitize explanation
  sanitized.explanation = normalizeToString(question.explanation) || 'No explanation provided.';

  // Sanitize difficulty
  sanitized.difficulty = typeof question.difficulty === 'string' ? question.difficulty : 'medium';

  // Sanitize subject
  sanitized.subject = typeof question.subject === 'string' ? question.subject : 'General';

  // Sanitize tags
  if (Array.isArray(question.tags)) {
    sanitized.tags = question.tags
      .filter(tag => typeof tag === 'string' && tag.trim())
      .map(tag => tag.trim());
  } else {
    sanitized.tags = [];
  }

  // Type-specific sanitization
  if (sanitized.type === 'MCQ' || sanitized.type === 'True/False') {
    // Algorithm-evaluated - needs proper options
    sanitized.options = sanitizeOptions(question.options, sanitized.type);
    if (!sanitized.options || sanitized.options.length < 2) {
      console.error('Failed to sanitize options, cannot recover question');
      return null;
    }
  } else if (sanitized.type === 'Fill in Blank' || sanitized.type === 'Short Answer' || sanitized.type === 'Subjective') {
    // AI-evaluated - just needs model answer (optional but helpful)
    sanitized.answer = normalizeToString(question.answer) || '';
  }

  return sanitized;
};

/**
 * Normalizes various types to string
 */
function normalizeToString(value) {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value && typeof value === 'object') {
    if (value.text) return normalizeToString(value.text);
    if (value.value) return normalizeToString(value.value);
    return JSON.stringify(value);
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/**
 * Sanitizes options array for MCQ/True-False questions
 */
function sanitizeOptions(options, questionType) {
  if (!Array.isArray(options)) {
    console.warn('Options is not an array, creating defaults');
    return createDefaultOptions(questionType);
  }

  const sanitizedOptions = options
    .map((option, index) => {
      if (!option) return null;

      const sanitizedOption = {
        text: normalizeToString(option.text || option),
        isCorrect: Boolean(option.isCorrect)
      };

      if (!sanitizedOption.text) {
        console.warn(`Option ${index} has no text, skipping`);
        return null;
      }

      return sanitizedOption;
    })
    .filter(opt => opt !== null);

  // Ensure minimum options
  if (sanitizedOptions.length < 2) {
    console.warn('Not enough valid options, using defaults');
    return createDefaultOptions(questionType);
  }

  // Ensure at least one correct answer
  const hasCorrect = sanitizedOptions.some(opt => opt.isCorrect);
  if (!hasCorrect) {
    console.warn('No correct answer found, marking first option as correct');
    sanitizedOptions[0].isCorrect = true;
  }

  // For True/False, ensure exactly 2 options
  if (questionType === 'True/False') {
    if (sanitizedOptions.length > 2) {
      sanitizedOptions.length = 2;
    }
    // Ensure one is True and one is False
    const correctCount = sanitizedOptions.filter(opt => opt.isCorrect).length;
    if (correctCount !== 1) {
      sanitizedOptions[0].isCorrect = true;
      sanitizedOptions[1].isCorrect = false;
    }
  }

  return sanitizedOptions;
}

/**
 * Creates default options based on question type
 */
function createDefaultOptions(questionType) {
  if (questionType === 'True/False') {
    return [
      { text: 'True', isCorrect: true },
      { text: 'False', isCorrect: false }
    ];
  }

  return [
    { text: 'Option A', isCorrect: true },
    { text: 'Option B', isCorrect: false },
    { text: 'Option C', isCorrect: false },
    { text: 'Option D', isCorrect: false }
  ];
}

/**
 * Validates an entire quiz structure
 */
export const validateQuizStructure = (quiz) => {
  const errors = [];
  const warnings = [];

  if (!quiz || typeof quiz !== 'object') {
    return {
      valid: false,
      errors: ['Quiz is not a valid object'],
      warnings: []
    };
  }

  if (!Array.isArray(quiz.questions)) {
    errors.push('Quiz must have a questions array');
  } else if (quiz.questions.length === 0) {
    errors.push('Quiz must have at least one question');
  } else {
    // Validate each question
    quiz.questions.forEach((question, index) => {
      const validation = validateQuestionStructure(question);
      if (!validation.valid) {
        errors.push(`Question ${index + 1}: ${validation.errors.join(', ')}`);
      }
      if (validation.warnings.length > 0) {
        warnings.push(`Question ${index + 1}: ${validation.warnings.join(', ')}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalQuestions: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
    validQuestions: Array.isArray(quiz.questions) 
      ? quiz.questions.filter(q => validateQuestionStructure(q).valid).length 
      : 0
  };
};