/**
 * @fileoverview Practice configuration modal for quiz settings.
 * 
 * This modal allows users to configure practice session settings including
 * timer options and immediate feedback preferences. It provides a clean, 
 * accessible interface for users to customize their quiz experience before
 * starting.
 * 
 * @module PracticeConfigModal
 */

import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * Practice configuration modal for quiz settings.
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.isOpen - Whether the modal is currently visible
 * @param {Function} props.onClose - Callback function when modal is closed
 * @param {Function} props.onStart - Callback function when quiz is started with configuration
 * @param {number} props.questionCount - Number of questions in the practice session
 * 
 * @returns {JSX.Element} The rendered configuration modal
 * 
 * @example
 * <PracticeConfigModal
 *   isOpen={showConfig}
 *   onClose={() => setShowConfig(false)}
 *   onStart={(config) => startQuiz(config)}
 *   questionCount={10}
 * />
 */
const PracticeConfigModal = ({ isOpen, onClose, onStart, questionCount }) => {
  /**
   * Current configuration state
   * @type {Object}
   */
  const [config, setConfig] = useState({
    immediateFeedback: true,
    totalTimer: 0, // Default to no timer
  });

  /**
   * Handle input changes for configuration settings
   * @param {string} field - The field name to update
   * @param {*} value - The new value for the field
   */
  const handleInputChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * Handle start button click to begin quiz with current configuration
   */
  const handleStart = () => {
    onStart({
      ...config,
      timerEnabled: config.totalTimer > 0,
    });
  };

  /**
   * Format seconds into a human-readable time string
   * @param {number} seconds - Time in seconds to format
   * @returns {string} Formatted time string (e.g., "5 minutes", "No timer")
   */
  const formatTime = (seconds) => {
    if (seconds === 0) return 'No timer';
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Practice Configuration">
      <div className="space-y-6 p-6">
        <p className="text-slate-600">
          You are about to start a practice session with{' '}
          <span className="font-bold text-slate-800">{questionCount}</span> question
          {questionCount > 1 ? 's' : ''}.
        </p>

        {/* Total Quiz Timer - Slider */}
        <div>
          <label htmlFor="quiz-timer" className="block text-sm font-medium text-slate-700 mb-2">
            Total Quiz Timer:{' '}
            <span className="text-amber-600 font-semibold">{formatTime(config.totalTimer)}</span>
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Off</span>
            <input
              id="quiz-timer"
              type="range"
              min="0"
              max="3600"
              step="300" // 5-minute steps
              value={config.totalTimer}
              onChange={(e) => handleInputChange('totalTimer', parseInt(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <span className="text-xs text-slate-500">60 min</span>
          </div>
        </div>

        {/* Immediate Feedback Toggle */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <label htmlFor="immediate-feedback" className="text-sm font-medium text-slate-700">
              Immediate Feedback
            </label>
            <p className="text-xs text-slate-500 mt-0.5">
              Show correct answers after each question
            </p>
          </div>
          <button
            id="immediate-feedback"
            role="switch"
            aria-checked={config.immediateFeedback}
            onClick={() => handleInputChange('immediateFeedback', !config.immediateFeedback)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.immediateFeedback ? 'bg-amber-600' : 'bg-slate-300'
            }`}
          >
            <span className="sr-only">Enable immediate feedback</span>
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.immediateFeedback ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleStart}>Start Quiz</Button>
        </div>
      </div>
    </Modal>
  );
};

export default PracticeConfigModal;
