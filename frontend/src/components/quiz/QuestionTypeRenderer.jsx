import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import AnswerOption from './AnswerOption';

const QuestionTypeRenderer = forwardRef(
  (
    { question, selectedAnswer, onAnswerSelect, disabled, showResult, immediateFeedback = true },
    ref
  ) => {
    const [textAnswer, setTextAnswer] = useState('');
    const [fillBlanks, setFillBlanks] = useState(['', '']);

    useEffect(() => {
      // Always reset state first to prevent using old answers for different question types
      setTextAnswer('');

      // Fixed: Safe initialization of fill blanks - use regex to find blank patterns
      // For FillUp questions, AI might use 'text' field instead of 'question' field
      const questionText = question.question || question.text || '';
      // Count any run of 3+ underscores as one blank
      const blankCount = (questionText.match(/_{3,}/g) || []).length;
      // Ensure at least one input if the type is Fill in Blank
      const atLeastOne = question.type === 'Fill in Blank' ? Math.max(1, blankCount) : blankCount;
      setFillBlanks(Array(atLeastOne).fill(''));

      if (selectedAnswer?.textAnswer) {
        if (question.type === 'Short Answer' && typeof selectedAnswer.textAnswer === 'string') {
          setTextAnswer(selectedAnswer.textAnswer);
        }
        if (question.type === 'Fill in Blank' && Array.isArray(selectedAnswer.textAnswer)) {
          setFillBlanks(selectedAnswer.textAnswer);
        }
      }
    }, [question, selectedAnswer]);

    useImperativeHandle(ref, () => ({
      getAnswer: () => {
        if (question.type === 'Short Answer') {
          return textAnswer.trim() ? textAnswer.trim() : null;
        }
        if (question.type === 'Fill in Blank') {
          return fillBlanks.some((b) => b.trim()) ? fillBlanks : null;
        }
        return null;
      },
    }));

    const handleTextChange = (value) => {
      setTextAnswer(value);
    };

    const handleBlankChange = (index, value) => {
      const newBlanks = [...fillBlanks];
      newBlanks[index] = value;
      setFillBlanks(newBlanks);
    };

    const handleTextSubmit = () => {
      if (textAnswer.trim()) {
        onAnswerSelect(0, false, false, textAnswer.trim());
      }
    };

    const handleFillBlankSubmit = () => {
      const allFilled = fillBlanks.every((blank) => blank.trim() !== '');
      if (allFilled) {
        const isCorrect =
          question.acceptableAnswers?.some((acceptableSet) =>
            acceptableSet.every(
              (acceptable, index) =>
                fillBlanks[index]?.toLowerCase().trim() === acceptable.toLowerCase()
            )
          ) || false;
        onAnswerSelect(0, isCorrect, false, fillBlanks);
      }
    };

    // Validate question structure
    if (!question || !question.type) {
      return <div className="text-red-500">Invalid question format</div>;
    }

    switch (question.type) {
      case 'MCQ':
      case 'True/False':
        return (
          <div className="space-y-3 sm:space-y-4">
            {question.options?.map((option, index) => (
              <AnswerOption
                key={index}
                option={option}
                letter={String.fromCharCode(65 + index)}
                selected={selectedAnswer?.optionIndex === index}
                disabled={disabled}
                onSelect={() => onAnswerSelect(index, option.isCorrect)}
                showResult={showResult}
                isCorrect={selectedAnswer?.optionIndex === index ? selectedAnswer.isCorrect : false}
              />
            ))}
          </div>
        );

      case 'Short Answer':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Your Answer:</label>
              <textarea
                value={textAnswer}
                onChange={(e) => handleTextChange(e.target.value)}
                disabled={disabled}
                placeholder="Type your answer here..."
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors resize-none disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>
            {immediateFeedback && !disabled && (
              <button
                onClick={handleTextSubmit}
                disabled={!textAnswer.trim()}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit Answer
              </button>
            )}
          </div>
        );

      case 'Fill in Blank':
        return (
          <div className="space-y-4">
            <div className="text-lg leading-relaxed">
              {(() => {
                const questionText = question.question || question.text || '';
                // Split by 5 or more underscores pattern, keeping the separators
                const parts = questionText.split(/(_{5,})/);

                return parts.map((part, index) => {
                  // If part matches the blank pattern (5 or more underscores), render input
                  if (/_{5,}/.test(part)) {
                    // Find the corresponding blank index
                    const blankIndex = parts.slice(0, index).filter((p) => /_{5,}/.test(p)).length;
                    return (
                      <input
                        key={index}
                        type="text"
                        value={fillBlanks[blankIndex] || ''}
                        onChange={(e) => handleBlankChange(blankIndex, e.target.value)}
                        disabled={disabled}
                        className="mx-2 px-3 py-1 border-b-2 border-amber-300 bg-transparent focus:border-amber-600 outline-none text-amber-700 font-semibold min-w-[120px] disabled:bg-slate-50"
                        placeholder={`Blank ${blankIndex + 1}`}
                      />
                    );
                  }
                  // Otherwise, return the text part
                  return <span key={index}>{part}</span>;
                });
              })()}
            </div>
            {immediateFeedback && !disabled && (
              <button
                onClick={handleFillBlankSubmit}
                disabled={!fillBlanks.every((blank) => blank.trim())}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit Answer
              </button>
            )}
          </div>
        );

      default:
        return <div>Unsupported question type: {question.type}</div>;
    }
  }
);

QuestionTypeRenderer.displayName = 'QuestionTypeRenderer';

export default QuestionTypeRenderer;
