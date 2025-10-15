import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const PracticeConfigModal = ({ isOpen, onClose, onStart, questionCount }) => {
  const [config, setConfig] = useState({
    immediateFeedback: true,
    totalTimer: 0, // Default to no timer
  });

  const handleInputChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleStart = () => {
    onStart({
      ...config,
      timerEnabled: config.totalTimer > 0,
    });
  };

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
