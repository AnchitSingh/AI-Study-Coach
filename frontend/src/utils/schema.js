// src/utils/schema.js
function isString(x) { return typeof x === 'string'; }
function isBool(x) { return typeof x === 'boolean'; }
function isNum(x) { return typeof x === 'number' && Number.isFinite(x); }
function isArray(x) { return Array.isArray(x); }
function isObject(x) { return x && typeof x === 'object' && !Array.isArray(x); }
function isNonEmptyString(x) { return typeof x === 'string' && x.trim().length > 0; }

/**
 * Validates a quiz object structure
 * @param {Object} obj - Quiz object to validate
 * @returns {boolean} True if valid
 */
export function validateQuiz(obj) {
    if (!isObject(obj)) {
        console.error('Quiz validation failed: not an object');
        return false;
    }

    if (!isArray(obj.questions)) {
        console.error('Quiz validation failed: questions is not an array');
        return false;
    }

    if (obj.questions.length === 0) {
        console.error('Quiz validation failed: questions array is empty');
        return false;
    }

    // Validate each question
    for (let i = 0; i < obj.questions.length; i++) {
        const q = obj.questions[i];

        if (!isObject(q)) {
            console.error(`Quiz validation failed: question ${i} is not an object`);
            return false;
        }

        // Type and question text are required
        if (!isNonEmptyString(q.type)) {
            console.error(`Quiz validation failed: question ${i} has invalid type`);
            return false;
        }

        if (!isNonEmptyString(q.question)) {
            console.error(`Quiz validation failed: question ${i} has invalid question text`);
            return false;
        }

        // Validate based on question type
        const validTypes = ['MCQ', 'True/False', 'Short Answer', 'Subjective', 'Fill in Blank'];
        if (!validTypes.includes(q.type)) {
            console.error(`Quiz validation failed: question ${i} has unknown type "${q.type}"`);
            return false;
        }

        // MCQ and True/False MUST have options (algorithm-evaluated)
        if (q.type === 'MCQ' || q.type === 'True/False') {
            if (!isArray(q.options)) {
                console.error(`Quiz validation failed: question ${i} options is not an array`);
                return false;
            }

            const minOptions = q.type === 'True/False' ? 2 : 2;
            if (q.options.length < minOptions) {
                console.error(`Quiz validation failed: question ${i} has fewer than ${minOptions} options`);
                return false;
            }

            // Validate each option
            let hasCorrect = false;
            for (let j = 0; j < q.options.length; j++) {
                const option = q.options[j];

                if (!isObject(option)) {
                    console.error(`Quiz validation failed: question ${i} option ${j} is not an object`);
                    return false;
                }

                if (!isNonEmptyString(option.text)) {
                    console.error(`Quiz validation failed: question ${i} option ${j} has invalid text`);
                    return false;
                }

                if (!isBool(option.isCorrect)) {
                    console.error(`Quiz validation failed: question ${i} option ${j} missing isCorrect boolean`);
                    return false;
                }

                if (option.isCorrect) {
                    hasCorrect = true;
                }
            }

            if (!hasCorrect) {
                console.error(`Quiz validation failed: question ${i} has no correct answer`);
                return false;
            }
        }

        // Fill in Blank and Short Answer/Subjective are AI-evaluated
        // They only need an 'answer' field (string) for reference
        if (q.type === 'Fill in Blank' || q.type === 'Short Answer' || q.type === 'Subjective') {
            if (!q.answer) {
                console.warn(`Question ${i} (${q.type}) is missing model answer - AI may struggle to evaluate`);
                // Not a fatal error - AI can still evaluate without a model answer
            }
        }

        // Explanation should be a string (warning only)
        if (q.explanation !== undefined && !isString(q.explanation)) {
            console.warn(`Question ${i} has non-string explanation`);
        }

        // Optional fields type checking
        if (q.difficulty !== undefined && !isString(q.difficulty)) {
            console.warn(`Question ${i} has non-string difficulty`);
        }

        if (q.subject !== undefined && !isString(q.subject)) {
            console.warn(`Question ${i} has non-string subject`);
        }

        if (q.tags !== undefined) {
            if (!isArray(q.tags)) {
                console.warn(`Question ${i} has non-array tags`);
            } else {
                const invalidTags = q.tags.filter(tag => !isString(tag));
                if (invalidTags.length > 0) {
                    console.warn(`Question ${i} has ${invalidTags.length} non-string tags`);
                }
            }
        }
    }

    return true;
}

/**
 * Validates an AI evaluation response
 * Matches what chromeAI.evaluateSubjectiveJSON returns
 */
export function validateEvaluation(obj) {
    if (!isObject(obj)) {
        console.error('Evaluation validation failed: not an object');
        return false;
    }

    // ⭐ Match what chromeAI actually returns
    if (typeof obj.isCorrect !== 'boolean') {
        console.error('Evaluation validation failed: isCorrect is not a boolean');
        return false;
    }

    // Check for either explanation (new format) or rationale (legacy format)
    if (!isString(obj.explanation) && !isString(obj.rationale)) {
        console.error('Evaluation validation failed: explanation or rationale is required and must be a string');
        return false;
    }

    // feedback is optional but if present should be string
    if (obj.feedback !== undefined && !isString(obj.feedback)) {
        console.warn('Evaluation has non-string feedback field');
    }

    return true;
}
/**
 * Validates recommendations structure
 * @param {Object} obj - Recommendations object to validate
 * @returns {boolean} True if valid
 */
export function validateRecommendations(obj) {
    if (!isObject(obj)) {
        console.error('Recommendations validation failed: not an object');
        return false;
    }

    const requiredArrays = ['strengths', 'weaknesses', 'nextSteps'];

    for (const field of requiredArrays) {
        if (!isArray(obj[field])) {
            console.error(`Recommendations validation failed: ${field} is not an array`);
            return false;
        }

        // Validate all elements are strings
        for (let i = 0; i < obj[field].length; i++) {
            if (!isString(obj[field][i])) {
                console.error(`Recommendations validation failed: ${field}[${i}] is not a string`);
                return false;
            }
        }
    }

    return true;
}

/**
 * Validates quiz configuration
 * @param {Object} config - Configuration object
 * @returns {boolean} True if valid
 */
export function validateConfig(config) {
    if (!isObject(config)) {
        console.error('Config validation failed: not an object');
        return false;
    }

    // Optional boolean fields
    const boolFields = ['immediateFeedback', 'timerEnabled'];
    for (const field of boolFields) {
        if (config[field] !== undefined && !isBool(config[field])) {
            console.error(`Config validation failed: ${field} is not a boolean`);
            return false;
        }
    }

    // Optional number fields
    const numFields = ['totalTimer', 'questionTimer'];
    for (const field of numFields) {
        if (config[field] !== undefined && !isNum(config[field])) {
            console.error(`Config validation failed: ${field} is not a number`);
            return false;
        }
    }

    // Optional string fields
    const strFields = ['difficulty', 'subject'];
    for (const field of strFields) {
        if (config[field] !== undefined && !isString(config[field])) {
            console.error(`Config validation failed: ${field} is not a string`);
            return false;
        }
    }

    return true;
}