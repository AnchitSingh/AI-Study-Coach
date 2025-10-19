/**
 * @fileoverview Answer option component for quiz questions.
 * 
 * This component represents a single answer option in a quiz question, with
 * visual feedback for selection, correctness, and disabled states. It handles
 * different styling states such as selected, correct, incorrect, and disabled,
 * providing clear visual cues to the user during quiz taking.
 * 
 * @module AnswerOption
 */

import React from 'react';

/**
 * Answer option component for quiz questions.
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.option - The answer option object with text and other properties
 * @param {string} props.letter - The letter identifier for the option (A, B, C, D)
 * @param {boolean} props.selected - Whether this option is currently selected
 * @param {boolean} props.disabled - Whether the option is disabled (usually after answering)
 * @param {Function} props.onSelect - Callback function when option is selected
 * @param {boolean} [props.showResult=false] - Whether to show result styling (correct/incorrect)
 * @param {boolean} [props.isCorrect=false] - Whether this option is the correct answer
 * 
 * @returns {JSX.Element} The rendered answer option component
 * 
 * @example
 * <AnswerOption
 *   option={{ text: "The correct answer" }}
 *   letter="A"
 *   selected={false}
 *   disabled={false}
 *   onSelect={() => console.log('Selected A')}
 *   showResult={true}
 *   isCorrect={true}
 * />
 */
const AnswerOption = ({
  option,
  letter,
  selected,
  disabled,
  onSelect,
  showResult = false,
  isCorrect = false,
}) => {
  /**
   * Get the appropriate CSS classes for the button based on current state
   * @returns {string} CSS classes for the button
   */
  const getButtonStyles = () => {
    let baseStyles =
      'w-full text-left p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2';

    if (disabled && showResult) {
      if (selected) {
        return `${baseStyles} ${
          isCorrect ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50 animate-shake'
        }`;
      } else if (option.isCorrect) {
        return `${baseStyles} border-green-400 bg-green-50`;
      } else {
        return `${baseStyles} border-slate-200 bg-slate-50 opacity-50`;
      }
    }

    if (selected) {
      return `${baseStyles} border-amber-400 bg-amber-50`;
    }

    if (disabled) {
      return `${baseStyles} border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed`;
    }

    return `${baseStyles} border-slate-200 hover:border-amber-300 hover:bg-amber-50/50`;
  };

  /**
   * Get the appropriate CSS classes for the letter circle based on current state
   * @returns {string} CSS classes for the circle
   */
  const getCircleStyles = () => {
    let baseStyles =
      'flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center transition-colors';

    if (disabled && showResult) {
      if (selected) {
        return `${baseStyles} ${
          isCorrect ? 'border-green-500 bg-green-100' : 'border-red-500 bg-red-100'
        }`;
      } else if (option.isCorrect) {
        return `${baseStyles} border-green-500 bg-green-100`;
      } else {
        return `${baseStyles} border-slate-300`;
      }
    }

    if (selected) {
      return `${baseStyles} border-amber-500 bg-amber-100`;
    }

    return `${baseStyles} border-slate-300 group-hover:border-amber-400`;
  };

  /**
   * Get the appropriate CSS classes for the option text based on current state
   * @returns {string} CSS classes for the text
   */
  const getTextStyles = () => {
    let baseStyles = 'text-base sm:text-lg transition-colors';

    if (disabled && showResult) {
      if (selected) {
        return `${baseStyles} ${isCorrect ? 'text-green-700' : 'text-red-700'}`;
      } else if (option.isCorrect) {
        return `${baseStyles} text-green-700`;
      } else {
        return `${baseStyles} text-slate-600`;
      }
    }

    if (selected) {
      return `${baseStyles} text-amber-800`;
    }

    return `${baseStyles} text-slate-700 group-hover:text-slate-800`;
  };

  /**
   * Get the appropriate CSS classes for the option letter based on current state
   * @returns {string} CSS classes for the letter
   */
  const getLetterStyles = () => {
    let baseStyles = 'font-semibold text-sm sm:text-base transition-colors';

    if (disabled && showResult) {
      if (selected) {
        return `${baseStyles} ${isCorrect ? 'text-green-600' : 'text-red-600'}`;
      } else if (option.isCorrect) {
        return `${baseStyles} text-green-600`;
      } else {
        return `${baseStyles} text-slate-600`;
      }
    }

    if (selected) {
      return `${baseStyles} text-amber-700`;
    }

    return `${baseStyles} text-slate-600 group-hover:text-amber-600`;
  };

  return (
    <button onClick={onSelect} disabled={disabled} className={getButtonStyles()}>
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className={getCircleStyles()}>
          <span className={getLetterStyles()}>{letter}</span>
        </div>
        <span className={getTextStyles()}>{option.text}</span>
      </div>
    </button>
  );
};

export default AnswerOption;
