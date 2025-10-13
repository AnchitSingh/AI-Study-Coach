/**
 * AI Response Transformer
 * Fixes common AI generation mistakes before validation
 */

/**
 * Transforms AI response to match expected schema
 */
export function transformAIQuizResponse(aiResponse) {
    if (!aiResponse || typeof aiResponse !== 'object') {
      return aiResponse;
    }
  
    // Clone to avoid mutations
    const transformed = JSON.parse(JSON.stringify(aiResponse));
  
    // Transform questions array
    if (Array.isArray(transformed.questions)) {
      transformed.questions = transformed.questions.map((q, index) => 
        transformQuestion(q, index)
      );
    }
  
    return transformed;
  }
  
  /**
   * Transforms a single question to fix common AI mistakes
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
      transformed.options = transformed.options.map(opt => {
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
   * Normalize question type variations
   */
  function normalizeQuestionType(type) {
    if (typeof type !== 'string') return 'MCQ';
    
    const typeMap = {
      'mcq': 'MCQ',
      'multiple choice': 'MCQ',
      'multiplechoice': 'MCQ',
      'true/false': 'True/False',
      'truefalse': 'True/False',
      'boolean': 'True/False',
      'tf': 'True/False',
      'fill in blank': 'Fill in Blank',
      'fill in the blank': 'Fill in Blank',
      'fillinblank': 'Fill in Blank',
      'fillup': 'Fill in Blank',
      'fill-up': 'Fill in Blank',
      'blanks': 'Fill in Blank',
      'short answer': 'Short Answer',
      'shortanswer': 'Short Answer',
      'subjective': 'Short Answer',
      'essay': 'Short Answer',
      'text': 'Short Answer'
    };
  
    const normalized = typeMap[type.toLowerCase()];
    return normalized || type;
  }
  
  /**
   * Fix True/False question structure
   */
  function fixTrueFalseQuestion(question) {
    const fixed = { ...question };
  
    // Ensure it has exactly 2 options
    if (!Array.isArray(fixed.options) || fixed.options.length !== 2) {
      const correctAnswer = fixed.answer;
      const isTrue = correctAnswer === 'True' || correctAnswer === true || 
                     (typeof correctAnswer === 'string' && correctAnswer.toLowerCase() === 'true');
  
      fixed.options = [
        { text: 'True', isCorrect: isTrue },
        { text: 'False', isCorrect: !isTrue }
      ];
    } else {
      // Ensure exactly one is correct
      const trueOption = fixed.options[0];
      const falseOption = fixed.options[1];
  
      if (!trueOption.isCorrect && !falseOption.isCorrect) {
        // No correct answer - use the 'answer' field if available
        const correctAnswer = fixed.answer;
        const isTrue = correctAnswer === 'True' || correctAnswer === true ||
                       (typeof correctAnswer === 'string' && correctAnswer.toLowerCase() === 'true');
        
        fixed.options[0].isCorrect = isTrue;
        fixed.options[1].isCorrect = !isTrue;
      }
    }
  
    return fixed;
  }
  
  /**
   * Fix MCQ question structure
   */
  function fixMCQQuestion(question) {
    const fixed = { ...question };
  
    // Ensure options array exists
    if (!Array.isArray(fixed.options)) {
      fixed.options = [];
    }
  
    // If no options have isCorrect, try to determine from 'answer' field
    if (fixed.options.length > 0 && !fixed.options.some(opt => opt.isCorrect)) {
      const correctAnswer = fixed.answer;
      
      if (correctAnswer) {
        // Try to find matching option
        const matchIndex = fixed.options.findIndex(opt => 
          opt.text === correctAnswer || 
          (typeof opt.text === 'string' && typeof correctAnswer === 'string' &&
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