import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

import { SOURCE_TYPE } from '../../utils/messages';

// Constants
const difficultyLevels = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'mixed', label: 'Mixed' },
];

const questionTypesData = [
  { value: 'MCQ', label: 'Multiple Choice', icon: '🔘' },
  { value: 'True/False', label: 'True/False', icon: '✓' },
  { value: 'Short Answer', label: 'Short Answer', icon: '✏️' },
  { value: 'Fill in Blank', label: 'Fill in Blank', icon: '📝' },
];

const questionCounts = [3, 5, 10, 15, 20];

const sourceOptions = [
  {
    value: SOURCE_TYPE.MANUAL,
    label: 'Custom Topic',
    icon: '✏️',
    description: 'Create quiz from any topic',
  },
  { value: SOURCE_TYPE.PDF, label: 'From PDF', icon: '📎', description: 'Upload a PDF file' },
];

const QuizSetupModal = ({ isOpen, onClose, onStartQuiz, recommendedTopic }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState({});
  const [pdfFile, setPdfFile] = useState(null);
  const fileInputRef = useRef(null);
  const modalBodyRef = useRef(null);
  const [isStartingQuiz, setIsStartingQuiz] = useState(false);

  const [config, setConfig] = useState({
    sourceType: SOURCE_TYPE.MANUAL,
    sourceValue: '',
    topic: '',
    context: '',
    questionCount: 5,
    difficulty: 'medium',
    questionTypes: ['MCQ'],
    immediateFeedback: true,
    totalTimer: 0,
  });

  useEffect(() => {
    // Pre-fill with recommended topic if provided
    if (isOpen && recommendedTopic) {
      setConfig((prev) => ({
        ...prev,
        sourceType: SOURCE_TYPE.MANUAL, // Use manual source for recommended topics
        topic: recommendedTopic,
        context: `Practice questions for ${recommendedTopic}`,
        sourceValue: recommendedTopic,
      }));
    }
  }, [isOpen, recommendedTopic]);

  // Focus management
  useEffect(() => {
    if (isOpen && modalBodyRef.current) {
      modalBodyRef.current.focus();
    }
  }, [isOpen]);

  // Cleanup
  useEffect(() => {
    return () => {
      setPdfFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
  }, []);

  const handleInputChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));

    // Clear errors for the field being edited
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSourceTypeChange = (sourceType) => {
    setConfig((prev) => ({
      ...prev,
      sourceType,
      sourceValue: '',
      // Keep topic and context
    }));
    setPdfFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setErrors({});
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      handleInputChange('sourceValue', file.name);
      setErrors((prev) => ({ ...prev, sourceValue: '' }));
    } else {
      setErrors((prev) => ({ ...prev, sourceValue: 'Please select a valid PDF file.' }));
    }
  };

  const handleQuestionTypeToggle = (type) => {
    setConfig((prev) => {
      const types = prev.questionTypes.includes(type)
        ? prev.questionTypes.filter((t) => t !== type)
        : [...prev.questionTypes, type];

      if (types.length === 0) {
        return prev;
      }

      return { ...prev, questionTypes: types };
    });

    if (errors.questionTypes) {
      setErrors((prev) => ({ ...prev, questionTypes: '' }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!config.topic.trim()) {
        newErrors.topic = 'Please enter a topic for your quiz';
      }

      if (config.sourceType === SOURCE_TYPE.PDF && !pdfFile) {
        newErrors.sourceValue = 'Please select a PDF file';
      }
    }

    if (step === 2) {
      if (config.questionTypes.length === 0) {
        newErrors.questionTypes = 'Please select at least one question type';
      }
    }

    setErrors(newErrors);

    // Show toast for validation errors
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return false;
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    setErrors({});
  };

  const handleStartQuiz = async () => {
    if (!validateStep(2)) return;

    setIsStartingQuiz(true);

    try {
      const finalConfig = {
        ...config,
        pdfFile,
        timerEnabled: config.totalTimer > 0,
      };

      toast.success('Quiz configuration complete! Starting quiz...');
      await onStartQuiz(finalConfig);
      onClose();

      // Reset form
      setConfig({
        sourceType: SOURCE_TYPE.MANUAL,
        sourceValue: '',
        topic: '',
        context: '',
        questionCount: 5,
        difficulty: 'medium',
        questionTypes: ['MCQ'],
        immediateFeedback: true,
        totalTimer: 0,
      });

      setPdfFile(null);
      setCurrentStep(1);
      setShowAdvanced(false);
      setErrors({});
    } finally {
      setIsStartingQuiz(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds === 0) return 'No timer';
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''}`;
  };

  const renderSourceSpecificInput = () => {
    switch (config.sourceType) {
      case SOURCE_TYPE.PDF:
        return (
          <div className="mt-4">
            <label htmlFor="quiz-pdf" className="block text-sm font-medium text-slate-700 mb-2">
              Upload PDF <span className="text-red-500">*</span>
            </label>
            <input
              id="quiz-pdf"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="sr-only"
              aria-describedby="pdf-help"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-full flex items-center justify-center px-4 py-3 border-2 border-dashed rounded-lg transition-all hover:bg-slate-50 ${
                errors.sourceValue ? 'border-red-300 bg-red-50' : 'border-slate-300'
              }`}
            >
              {pdfFile ? (
                <span className="flex items-center gap-2 text-sm">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {pdfFile.name}
                </span>
              ) : (
                <span className="text-sm text-slate-500">Click to choose a PDF file</span>
              )}
            </button>
            {errors.sourceValue && (
              <p className="text-red-500 text-xs mt-1">{errors.sourceValue}</p>
            )}
            <p id="pdf-help" className="text-xs text-slate-500 mt-2">
              Maximum file size: 10MB
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Source Selection */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Choose your quiz source</h3>
        <div className="grid grid-cols-2 gap-3">
          {sourceOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSourceTypeChange(opt.value)}
              className={`relative flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left ${
                config.sourceType === opt.value
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
              aria-pressed={config.sourceType === opt.value}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xl" aria-hidden="true">
                  {opt.icon}
                </span>
                <span className="font-medium text-slate-900">{opt.label}</span>
              </div>
              <span className="text-xs text-slate-500">{opt.description}</span>
              {config.sourceType === opt.value && (
                <svg
                  className="absolute top-3 right-3 w-5 h-5 text-amber-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Source-specific input (URL or PDF) */}
      {renderSourceSpecificInput()}

      {/* Quiz Topic and Context - Always visible */}
      <div className="space-y-4">
        <div>
          <label htmlFor="quiz-topic" className="block text-sm font-medium text-slate-700 mb-2">
            Quiz Topic <span className="text-red-500">*</span>
          </label>
          <input
            id="quiz-topic"
            type="text"
            value={config.topic}
            onChange={(e) => handleInputChange('topic', e.target.value)}
            placeholder="e.g., World War II, Python Programming..."
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all ${
              errors.topic ? 'border-red-300 bg-red-50' : 'border-slate-200'
            }`}
            aria-invalid={errors.topic ? 'true' : 'false'}
            aria-describedby={errors.topic ? 'topic-error' : undefined}
          />
          {errors.topic && (
            <p id="topic-error" className="text-red-500 text-xs mt-1">
              {errors.topic}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="quiz-context" className="block text-sm font-medium text-slate-700 mb-2">
            Additional Context
            <span className="text-xs text-slate-400 font-normal ml-2">(Optional)</span>
          </label>
          <textarea
            id="quiz-context"
            value={config.context}
            onChange={(e) => handleInputChange('context', e.target.value)}
            placeholder="Specific areas to focus on..."
            rows={2}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Basic Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Basic Settings</h3>

        {/* Question Count - Centered */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Number of Questions
          </label>
          <div className="flex justify-center gap-2">
            {questionCounts.map((count) => (
              <button
                key={count}
                onClick={() => handleInputChange('questionCount', count)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  config.questionCount === count
                    ? 'bg-amber-100 text-amber-700 border-2 border-amber-400'
                    : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
                aria-pressed={config.questionCount === count}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Question Types */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Question Types <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {questionTypesData.map((type) => (
              <label
                key={type.value}
                className={`relative flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  config.questionTypes.includes(type.value)
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={config.questionTypes.includes(type.value)}
                  onChange={() => handleQuestionTypeToggle(type.value)}
                  className="sr-only"
                  aria-describedby={`${type.value}-label`}
                />
                <span className="text-lg" aria-hidden="true">
                  {type.icon}
                </span>
                <span id={`${type.value}-label`} className="text-sm font-medium text-slate-700">
                  {type.label}
                </span>
                {config.questionTypes.includes(type.value) && (
                  <svg
                    className="absolute top-2 right-2 w-5 h-5 text-amber-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </label>
            ))}
          </div>
          {errors.questionTypes && (
            <p className="text-red-500 text-xs mt-1">{errors.questionTypes}</p>
          )}
        </div>
      </div>

      {/* Advanced Settings Accordion */}
      <div className="border border-slate-200 rounded-lg">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors rounded-lg"
          aria-expanded={showAdvanced}
          aria-controls="advanced-settings"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <svg
              className="w-5 h-5 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            Advanced Settings
          </span>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div id="advanced-settings" className="border-t border-slate-200 p-4 space-y-4">
            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Difficulty Level
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {difficultyLevels.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => handleInputChange('difficulty', level.value)}
                    className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                      config.difficulty === level.value
                        ? 'bg-amber-100 text-amber-700 border-2 border-amber-400'
                        : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                    aria-pressed={config.difficulty === level.value}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Quiz Timer - Slider */}
            <div>
              <label htmlFor="quiz-timer" className="block text-sm font-medium text-slate-700 mb-2">
                Total Quiz Timer:{' '}
                <span className="text-amber-600 font-semibold">
                  {formatTime(config.totalTimer)}
                </span>
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">0</span>
                <input
                  id="quiz-timer"
                  type="range"
                  min="0"
                  max="3600"
                  step="60"
                  value={config.totalTimer}
                  onChange={(e) => handleInputChange('totalTimer', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  style={{
                    background: `linear-gradient(to right, rgb(251 191 36) 0%, rgb(251 191 36) ${(config.totalTimer / 3600) * 100}%, rgb(226 232 240) ${(config.totalTimer / 3600) * 100}%, rgb(226 232 240) 100%)`,
                  }}
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
        )}
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title=""
        size="lg"
        className="flex flex-col max-h-[90vh]"
      >
        <div className="flex flex-col h-full" ref={modalBodyRef} tabIndex={-1}>
          {/* Fixed Header */}
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Create Your Quiz</h2>
            <div className="flex items-center gap-2 mt-3">
              {[1, 2].map((step) => (
                <React.Fragment key={step}>
                  <div
                    className={`flex items-center gap-2 ${currentStep >= step ? 'text-amber-600' : 'text-slate-400'}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                        currentStep >= step
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {currentStep > step ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        step
                      )}
                    </div>
                    <span className="text-xs font-medium hidden sm:inline">
                      {step === 1 ? 'Source' : 'Configure'}
                    </span>
                  </div>
                  {step < 2 && (
                    <div
                      className={`flex-1 h-0.5 transition-colors ${
                        currentStep > step ? 'bg-amber-200' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {currentStep === 1 ? renderStep1() : renderStep2()}
          </div>

          {/* Fixed Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white">
            <div className="flex gap-3">
              {currentStep > 1 && (
                <Button onClick={handleBack} variant="secondary" className="flex-1">
                  Back
                </Button>
              )}
              <Button onClick={onClose} variant="secondary" className="flex-1">
                Cancel
              </Button>
              {currentStep === 1 ? (
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleStartQuiz}
                  loading={isStartingQuiz}
                  disabled={isStartingQuiz}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                >
                  {isStartingQuiz ? 'Starting Quiz...' : 'Start Quiz'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default QuizSetupModal;
