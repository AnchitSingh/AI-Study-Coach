/**
 * @fileoverview Story setup modal component for configuring story parameters.
 * 
 * This component provides a multi-step modal interface for users to configure
 * their story settings, including source selection (manual or PDF), topic,
 * and storytelling style. It includes validation and error handling to ensure
 * proper configuration before generating the story.
 * 
 * @module StorySetupModal
 */

import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

import { SOURCE_TYPE } from '../../utils/messages';

/**
 * Available storytelling styles with their descriptions
 * @type {Array<Object>}
 */
const storyStyles = [
  { value: 'Grandpa', label: 'Grandpa', icon: '👴', description: 'Warm storytelling style' },
  { value: 'Simple Words', label: 'Simple Words', icon: '📖', description: 'Easy to understand' },
  { value: 'Deep Dive', label: 'Deep Dive', icon: '🔬', description: 'Detailed explanation' },
  { value: 'ELI5', label: 'ELI5', icon: '👶', description: "Explain like I'm 5" },
];

/**
 * Available source options for story content
 * @type {Array<Object>}
 */
const sourceOptions = [
  {
    value: SOURCE_TYPE.MANUAL,
    label: 'Custom Topic',
    icon: '✏️',
    description: 'Explain any topic',
  },
  { value: SOURCE_TYPE.PDF, label: 'From PDF', icon: '📎', description: 'Upload a PDF file' },
];

/**
 * Story setup modal component for configuring story parameters.
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.isOpen - Whether the modal is currently visible
 * @param {Function} props.onClose - Callback function when modal is closed
 * @param {Function} props.onStartStory - Callback function when story is started with configuration
 * 
 * @returns {JSX.Element} The rendered story setup modal
 * 
 * @example
 * <StorySetupModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onStartStory={handleStartStory}
 * />
 */
const StorySetupModal = ({ isOpen, onClose, onStartStory }) => {
  /**
   * Current step in the multi-step modal (1 or 2)
   * @type {number}
   */
  const [currentStep, setCurrentStep] = useState(1);
  
  /**
   * Field-specific validation errors
   * @type {Object}
   */
  const [errors, setErrors] = useState({});
  
  /**
   * Selected PDF file (if source is PDF)
   * @type {File|null}
   */
  const [pdfFile, setPdfFile] = useState(null);
  
  /**
   * Reference to file input element
   * @type {React.MutableRefObject<HTMLInputElement>}
   */
  const fileInputRef = useRef(null);
  
  /**
   * Reference to modal body for focus management
   * @type {React.MutableRefObject<HTMLDivElement>}
   */
  const modalBodyRef = useRef(null);
  
  /**
   * Whether the story is being generated (loading state)
   * @type {boolean}
   */
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Current story configuration state
   * @type {Object}
   */
  const [config, setConfig] = useState({
    sourceType: SOURCE_TYPE.MANUAL,
    sourceValue: '',
    topic: '',
    context: '',
    storyStyle: 'Simple Words',
  });

  /**
   * Manage focus when modal opens
   */
  useEffect(() => {
    if (isOpen && modalBodyRef.current) {
      modalBodyRef.current.focus();
    }
  }, [isOpen]);

  /**
   * Clean up file uploads when component unmounts
   */
  useEffect(() => {
    return () => {
      setPdfFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
  }, []);

  /**
   * Handle changes to configuration fields
   * @param {string} field - Field name to update
   * @param {*} value - New value for the field
   */
  const handleInputChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  /**
   * Handle source type selection
   * @param {string} sourceType - New source type to set
   */
  const handleSourceTypeChange = (sourceType) => {
    setConfig((prev) => ({
      ...prev,
      sourceType,
      sourceValue: '',
    }));
    setPdfFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setErrors({});
  };

  /**
   * Handle PDF file selection
   * @param {React.ChangeEvent<HTMLInputElement>} e - File input change event
   */
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

  /**
   * Validate the current step before proceeding
   * @param {number} step - Current step to validate
   * @returns {boolean} Whether validation passed
   */
  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!config.topic.trim()) {
        newErrors.topic = 'Please enter a topic for your story';
      }

      if (config.sourceType === SOURCE_TYPE.PDF && !pdfFile) {
        newErrors.sourceValue = 'Please select a PDF file';
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return false;
    }

    return true;
  };

  /**
   * Proceed to the next step
   */
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  /**
   * Go back to the previous step
   */
  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    setErrors({});
  };

  /**
   * Generate the story with the configured parameters
   */
  const handleGenerateStory = async () => {
    if (!validateStep(2)) return;

    setIsGenerating(true);

    try {
      const finalConfig = {
        ...config,
        pdfFile,
      };

      toast.success('Story configuration complete! Generating story...');
      await onStartStory(finalConfig);
      onClose();

      // Reset form
      setConfig({
        sourceType: SOURCE_TYPE.MANUAL,
        sourceValue: '',
        topic: '',
        context: '',
        storyStyle: 'Simple Words',
      });

      setPdfFile(null);
      setCurrentStep(1);
      setErrors({});
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Render source-specific input fields based on selected source type
   * @returns {JSX.Element|null} Source-specific input component or null
   */
  const renderSourceSpecificInput = () => {
    switch (config.sourceType) {
      case SOURCE_TYPE.PDF:
        return (
          <div className="mt-4">
            <label htmlFor="story-pdf" className="block text-sm font-medium text-slate-700 mb-2">
              Upload PDF <span className="text-red-500">*</span>
            </label>
            <input
              id="story-pdf"
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

  /**
   * Render the first step of the setup modal
   * @returns {JSX.Element} Step 1 content
   */
  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Source Selection */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Choose your story source</h3>
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

      {/* Source-specific input */}
      {renderSourceSpecificInput()}

      {/* Story Topic and Context */}
      <div className="space-y-4">
        <div>
          <label htmlFor="story-topic" className="block text-sm font-medium text-slate-700 mb-2">
            Story Topic <span className="text-red-500">*</span>
          </label>
          <input
            id="story-topic"
            type="text"
            value={config.topic}
            onChange={(e) => handleInputChange('topic', e.target.value)}
            placeholder="e.g., The Battle of Hastings, Photosynthesis..."
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
          <label htmlFor="story-context" className="block text-sm font-medium text-slate-700 mb-2">
            Additional Context
            <span className="text-xs text-slate-400 font-normal ml-2">(Optional)</span>
          </label>
          <textarea
            id="story-context"
            value={config.context}
            onChange={(e) => handleInputChange('context', e.target.value)}
            placeholder="Specific aspects to focus on..."
            rows={2}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
          />
        </div>
      </div>
    </div>
  );

  /**
   * Render the second step of the setup modal
   * @returns {JSX.Element} Step 2 content
   */
  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Choose Story Style</h3>
        <p className="text-sm text-slate-600 mb-4">Select how you want the story to be told</p>
        <div className="grid grid-cols-2 gap-3">
          {storyStyles.map((style) => (
            <button
              key={style.value}
              onClick={() => handleInputChange('storyStyle', style.value)}
              className={`relative flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left ${
                config.storyStyle === style.value
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
              aria-pressed={config.storyStyle === style.value}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl" aria-hidden="true">
                  {style.icon}
                </span>
                <span className="font-medium text-slate-900">{style.label}</span>
              </div>
              <span className="text-xs text-slate-500">{style.description}</span>
              {config.storyStyle === style.value && (
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

      {/* Story Preview Info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-3">
          <svg
            className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 mb-1">About {config.storyStyle}</h4>
            <p className="text-xs text-blue-700">
              {config.storyStyle === 'Grandpa' &&
                'A warm, narrative style that tells the story in an engaging and personal way, like a grandparent sharing wisdom.'}
              {config.storyStyle === 'Simple Words' &&
                "Clear and straightforward explanations using everyday language that's easy to follow."}
              {config.storyStyle === 'Deep Dive' &&
                'Comprehensive and detailed exploration of the topic with thorough explanations and examples.'}
              {config.storyStyle === 'ELI5' &&
                'Simplified explanations that break down complex topics into easy-to-understand concepts, perfect for beginners.'}
            </p>
          </div>
        </div>
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
            <h2 className="text-xl font-bold text-slate-900">Create Your Story</h2>
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
                      {step === 1 ? 'Source' : 'Style'}
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
                  onClick={handleGenerateStory}
                  loading={isGenerating}
                  disabled={isGenerating}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                >
                  {isGenerating ? 'Generating Story...' : 'Generate Story'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default StorySetupModal;
