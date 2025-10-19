/**
 * @fileoverview AI response transformer for fixing common generation mistakes.
 * 
 * This module provides utilities for transforming raw AI-generated responses
 * into properly formatted structures that match the application's expected
 * schemas. It handles common AI generation issues such as:
 * 
 * - Inconsistent question type naming
 * - Incorrect option structures
 * - Missing required fields
 * - Structural inconsistencies between different AI models
 * 
 * The transformer ensures reliable data processing by applying consistent
 * normalization rules and fixing typical AI output problems before validation.
 * 
 * @module aiResponseTransformer
 */

/**
 * Transforms AI response to match expected schema.
 * 
 * Applies transformations to raw AI-generated quiz responses to ensure
 * they conform to the application's expected data structures. This
 * includes normalizing question types, fixing option arrays, and
 * correcting common structural issues.
 * 
 * @param {Object} aiResponse - Raw AI-generated quiz response
 * @returns {Object} Transformed response matching expected schema
 * 
 * @example
 * const rawResponse = {\n *   questions: [\n *     {\n *       type: 'multiple choice',\n *       question: 'What is 2+2?',\n *       options: [\n *         { text: '3', correct: false },\n *         { text: '4', correct: true }\n *       ]\n *     }\n *   ]\n * };\n * \n * const transformed = transformAIQuizResponse(rawResponse);\n * // Result has normalized types and 'isCorrect' fields
 */
export function transformAIQuizResponse(aiResponse) {
  if (!aiResponse || typeof aiResponse !== 'object') {
    return aiResponse;
  }

  // Clone to avoid mutations
  const transformed = JSON.parse(JSON.stringify(aiResponse));

  // Transform questions array
  if (Array.isArray(transformed.questions)) {
    transformed.questions = transformed.questions.map((q, index) => transformQuestion(q, index));
  }

  return transformed;
}

/**
 * Transforms a single question to fix common AI mistakes.
 * 
 * Applies various corrections to individual questions including:
 * - Normalizing question type names
 * - Fixing True/False question structures
 * - Fixing MCQ question structures
 * - Converting 'correct' fields to 'isCorrect'
 * 
 * @param {Object} question - Raw AI-generated question
 * @param {number} index - Question index in the quiz
 * @returns {Object} Transformed question with corrected structure
 * 
 * @example
 * const rawQuestion = {\n *   type: 'truefalse',\n *   question: 'The sky is blue',\n *   answer: 'True',\n *   options: [\n *     { text: 'True', correct: true },\n *     { text: 'False', correct: false }\n *   ]\n * };\n * \n * const transformed = transformQuestion(rawQuestion, 0);\n * // Result has normalized type 'True/False' and 'isCorrect' fields
 */
function transformQuestion(question, index) {
  if (!question || typeof question !== 'object') {
    return question;
  }

  const transformed = { ...question };

  // Fix type variations
  transformed.type = normalizeQuestionType(transformed.type);

  // Fix True/False questions
  if (transformed.type === 'True/False') {
    transformed = fixTrueFalseQuestion(transformed);
  }

  // Fix MCQ questions
  if (transformed.type === 'MCQ') {
    transformed = fixMCQQuestion(transformed);
  }

  // Fix options array (convert 'correct' to 'isCorrect')
  if (Array.isArray(transformed.options)) {
    transformed.options = transformed.options.map((opt) => {
      if (!opt || typeof opt !== 'object') return opt;

      const fixed = { ...opt };

      // Convert 'correct' to 'isCorrect'
      if ('correct' in fixed && !('isCorrect' in fixed)) {
        fixed.isCorrect = Boolean(fixed.correct);
        delete fixed.correct;
      }

      return fixed;
    });
  }

  return transformed;
}

/**
 * Normalize question type variations.
 * 
 * Converts various AI-generated question type names to standardized
 * format. Handles common variations and typos to ensure consistent
 * type identification across different AI models.
 * 
 * @param {string} type - Raw question type from AI response
 * @returns {string} Normalized question type
 * 
 * @example
 * const normalized = normalizeQuestionType('multiple choice'); // 'MCQ'
 * const unchanged = normalizeQuestionType('Unknown'); // 'Unknown'
 */
function normalizeQuestionType(type) {
  if (typeof type !== 'string') return 'MCQ';

  const typeMap = {
    mcq: 'MCQ',
    'multiple choice': 'MCQ',
    multiplechoice: 'MCQ',
    'true/false': 'True/False',
    truefalse: 'True/False',
    boolean: 'True/False',
    tf: 'True/False',
    'fill in blank': 'Fill in Blank',
    'fill in the blank': 'Fill in Blank',
    fillinblank: 'Fill in Blank',
    fillup: 'Fill in Blank',
    'fill-up': 'Fill in Blank',
    blanks: 'Fill in Blank',
    'short answer': 'Short Answer',
    shortanswer: 'Short Answer',
    subjective: 'Short Answer',
    essay: 'Short Answer',
    text: 'Short Answer',
  };

  const normalized = typeMap[type.toLowerCase()];
  return normalized || type;
}

/**
 * Fix True/False question structure.
 * 
 * Ensures True/False questions have exactly two options with
 * proper 'isCorrect' flags. Handles cases where AI generates
 * incorrect option structures or missing correctness indicators.
 * 
 * @param {Object} question - Raw True/False question
 * @returns {Object} Fixed True/False question with proper structure
 * 
 * @example
 * const rawTF = {\n *   type: 'True/False',\n *   question: 'Water boils at 100°C',\n *   answer: 'True'\n * };\n * \n * const fixed = fixTrueFalseQuestion(rawTF);\n * // Result has options: [{ text: 'True', isCorrect: true }, { text: 'False', isCorrect: false }]
 */
function fixTrueFalseQuestion(question) {
  const fixed = { ...question };

  // Ensure it has exactly 2 options
  if (!Array.isArray(fixed.options) || fixed.options.length !== 2) {
    const correctAnswer = fixed.answer;
    const isTrue =
      correctAnswer === 'True' ||
      correctAnswer === true ||
      (typeof correctAnswer === 'string' && correctAnswer.toLowerCase() === 'true');

    fixed.options = [
      { text: 'True', isCorrect: isTrue },
      { text: 'False', isCorrect: !isTrue },
    ];
  } else {
    // Ensure exactly one is correct
    const trueOption = fixed.options[0];
    const falseOption = fixed.options[1];

    if (!trueOption.isCorrect && !falseOption.isCorrect) {
      // No correct answer - use the 'answer' field if available
      const correctAnswer = fixed.answer;
      const isTrue =
        correctAnswer === 'True' ||
        correctAnswer === true ||
        (typeof correctAnswer === 'string' && correctAnswer.toLowerCase() === 'true');

      fixed.options[0].isCorrect = isTrue;
      fixed.options[1].isCorrect = !isTrue;
    }
  }

  return fixed;
}

/**
 * Fix MCQ question structure.
 * 
 * Ensures MCQ questions have proper option arrays with at least one
 * correct answer. Handles cases where AI omits correctness indicators
 * by inferring correct answers from the 'answer' field.
 * 
 * @param {Object} question - Raw MCQ question
 * @returns {Object} Fixed MCQ question with proper structure
 * 
 * @example
 * const rawMCQ = {\n *   type: 'MCQ',\n *   question: 'Capital of France?',\n *   answer: 'Paris',\n *   options: [\n *     { text: 'London' },\n *     { text: 'Paris' },\n *     { text: 'Berlin' }\n *   ]\n * };\n * \n * const fixed = fixMCQQuestion(rawMCQ);\n * // Result has 'isCorrect: true' on the Paris option
 */
function fixMCQQuestion(question) {
  const fixed = { ...question };

  // Ensure options array exists
  if (!Array.isArray(fixed.options)) {
    fixed.options = [];
  }

  // If no options have isCorrect, try to determine from 'answer' field
  if (fixed.options.length > 0 && !fixed.options.some((opt) => opt.isCorrect)) {
    const correctAnswer = fixed.answer;

    if (correctAnswer) {
      // Try to find matching option
      const matchIndex = fixed.options.findIndex(
        (opt) =>
          opt.text === correctAnswer ||
          (typeof opt.text === 'string' &&
            typeof correctAnswer === 'string' &&
            opt.text.toLowerCase() === correctAnswer.toLowerCase())
      );

      if (matchIndex >= 0) {
        fixed.options[matchIndex].isCorrect = true;
      } else {
        // Default to first option
        fixed.options[0].isCorrect = true;
      }
    } else {
      // No answer provided - default to first option
      fixed.options[0].isCorrect = true;
    }
  }

  return fixed;
}
