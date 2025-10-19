/**
 * @fileoverview Question card component for displaying quiz questions and answers.
 * 
 * This component represents a single question in a quiz, displaying the question
 * text, answer options, feedback, and navigation controls. It manages the state
 * for answer selection, feedback display, and modal dialogs for pause/stop
 * functionality.
 * 
 * @module QuestionCard
 */

import React, { useState } from 'react';
import { Clock, Bookmark, Pause, Square } from 'lucide-react';
import AnswerOption from './AnswerOption';
import FeedbackSection from './FeedbackSection';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * Question card component for displaying quiz questions and answers.
 * 
 * @param {Object} props - Component properties
 * @param {string} props.question - The question text to display
 * @param {Array} props.options - Array of answer options
 * @param {Function} props.onAnswer - Callback for when an answer is selected
 * @param {Function} props.onBookmark - Callback for bookmarking the question
 * @param {Function} props.onPause - Callback for pausing the quiz
 * @param {Function} props.onStop - Callback for stopping the quiz
 * 
 * @returns {JSX.Element} The rendered question card component
 * 
 * @example
 * <QuestionCard
 *   question="What is the powerhouse of the cell?"
 *   options={[
 *     { text: "Nucleus", isCorrect: false },
 *     { text: "Mitochondria", isCorrect: true },
 *     { text: "Ribosome", isCorrect: false },
 *     { text: "Endoplasmic reticulum", isCorrect: false }
 *   ]}
 *   onAnswer={(id, correct) => console.log('Answered:', id, correct)}
 *   onBookmark={() => console.log('Bookmarked')}
 *   onPause={() => console.log('Paused')}
 *   onStop={() => console.log('Stopped')}
 * />
 */
const QuestionCard = ({ question, options, onAnswer, onBookmark, onPause, onStop }) => {
  /**
   * The currently selected answer
   * @type {Object|null}
   */
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  
  /**
   * Whether to show feedback for the selected answer
   * @type {boolean}
   */
  const [showFeedback, setShowFeedback] = useState(false);
  
  /**
   * Whether the pause modal is visible
   * @type {boolean}
   */
  const [showPauseModal, setShowPauseModal] = useState(false);
  
  /**
   * Whether the stop modal is visible
   * @type {boolean}
   */
  const [showStopModal, setShowStopModal] = useState(false);

  /**
   * Handle answer selection and update state
   * @param {number} optionId - Index of the selected option
   * @param {boolean} isCorrect - Whether the selected answer is correct
   */
  const handleAnswerSelect = (optionId, isCorrect) => {
    setSelectedAnswer({ optionId, isCorrect });
    setShowFeedback(true);
    onAnswer(optionId, isCorrect);
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border border-white/20 p-5 sm:p-8">
      {/* Question Section */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-start space-x-3 sm:space-x-4 mb-4 sm:mb-6">
          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl sm:rounded-2xl flex items-center justify-center">
            <span className="text-amber-700 font-bold text-base sm:text-lg">Q3</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 leading-relaxed">
              {question}
            </h2>
            <p className="text-slate-600 mt-2 text-xs sm:text-sm">
              Choose the best answer from the options below
            </p>
          </div>
        </div>
      </div>

      {/* Answer Options */}
      <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
        {options.map((option, index) => (
          <AnswerOption
            key={index}
            option={option}
            letter={String.fromCharCode(65 + index)}
            selected={selectedAnswer?.optionId === index}
            disabled={selectedAnswer !== null}
            onSelect={() => handleAnswerSelect(index, option.isCorrect)}
          />
        ))}
      </div>

      {/* Feedback Section */}
      {showFeedback && (
        <FeedbackSection
          isCorrect={selectedAnswer?.isCorrect}
          explanation="Mitochondria are indeed the powerhouses of the cell, responsible for producing ATP through cellular respiration."
        />
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 sm:pt-6 border-t border-slate-200">
        <button className="inline-flex items-center px-3 sm:px-6 py-2 sm:py-3 text-slate-600 hover:text-slate-800 font-medium transition-colors duration-200 text-sm sm:text-base">
          <span className="mr-1 sm:mr-2">←</span>
          <span className="hidden sm:inline">Previous</span>
          <span className="sm:hidden">Prev</span>
        </button>

        <button
          disabled={!selectedAnswer}
          className="inline-flex items-center px-4 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl sm:rounded-2xl shadow-lg shadow-amber-600/25 hover:shadow-amber-600/40 hover:scale-105 transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          <span className="hidden sm:inline">Next Question</span>
          <span className="sm:hidden">Next</span>
          <span className="ml-1 sm:ml-2">→</span>
        </button>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        title="Quiz Paused"
        icon={<Pause className="w-8 h-8 text-amber-600" />}
      >
        <p className="text-gray-600 mb-6">
          Your progress has been saved. You can resume anytime from where you left off.
        </p>
        <div className="flex flex-col space-y-3">
          <Button onClick={() => setShowPauseModal(false)} variant="primary" className="w-full">
            Resume Quiz
          </Button>
          <Button onClick={onPause} variant="secondary" className="w-full">
            Back to Home
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showStopModal}
        onClose={() => setShowStopModal(false)}
        title="Stop Quiz?"
        icon={<Square className="w-8 h-8 text-red-600" />}
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to stop this quiz? Your current progress will be saved, but the quiz
          will end.
        </p>
        <div className="flex flex-col space-y-3">
          <Button onClick={onStop} variant="danger" className="w-full">
            Yes, Stop Quiz
          </Button>
          <Button onClick={() => setShowStopModal(false)} variant="secondary" className="w-full">
            Continue Quiz
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default QuestionCard;
