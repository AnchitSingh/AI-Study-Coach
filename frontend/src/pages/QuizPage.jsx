import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import AIProcessingFeedback from '../components/ui/AIProcessingFeedback';
import useQuizState from '../hooks/useQuizState';
import QuizStyles from './QuizStyles';
import QuizResultsPage from './QuizResultsPage';
import BackgroundEffects from '../components/ui/BackgroundEffects';

const QuizPage = ({ onNavigate, quizConfig = null }) => {
  const answerRef = useRef();

  const {
    quiz,
    config,
    currentQuestion,
    currentQuestionIndex,
    currentQuestionNumber,
    timeRemaining,
    isQuizActive,
    isPaused,
    isLoading,
    error,
    showFeedback,
    selectedAnswer,
    userAnswers,
    isLastQuestion,
    progress,
    isBookmarked,
    selectAnswer,
    nextQuestion,
    previousQuestion,
    toggleBookmark,
    pauseQuiz,
    stopQuiz,
    toggleImmediateFeedback,
    goToQuestion,
    clearError,
    currentDraft,
    saveDraftAnswer,
    isEvaluating,
    evaluationProgress,
  } = useQuizState(quizConfig, answerRef);

  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [showAIProcessing, setShowAIProcessing] = useState(false);
  const [aiTask, setAITask] = useState('processing');
  const [showMobileNav, setShowMobileNav] = useState(true);
  const [textAnswer, setTextAnswer] = useState('');
  const [fillBlanks, setFillBlanks] = useState(['']);
  const [isPausingQuiz, setIsPausingQuiz] = useState(false);
  const [isStoppingQuiz, setIsStoppingQuiz] = useState(false);

  answerRef.current = { textAnswer, fillBlanks, selectedAnswer };

  // Initialize fill blanks based on question type
  React.useEffect(() => {
    if (!currentQuestion) return;

    // Reset states first
    setTextAnswer('');

    if (currentQuestion.type === 'Fill in Blank') {
      const questionText =
        typeof currentQuestion.question === 'string' ? currentQuestion.question : '';

      // Count blanks (3+ underscores)
      const blanksCount = questionText ? (questionText.match(/_{3,}/g) || []).length : 0;
      setFillBlanks(Array(Math.max(1, blanksCount)).fill(''));
    } else {
      setFillBlanks(['']);
    }

    // Restore from saved answer first, then from draft
    const existingAnswer = userAnswers[currentQuestionIndex];

    if (existingAnswer && existingAnswer.textAnswer) {
      if (
        (currentQuestion.type === 'Short Answer' || currentQuestion.type === 'Subjective') &&
        typeof existingAnswer.textAnswer === 'string'
      ) {
        setTextAnswer(existingAnswer.textAnswer);
      }
      if (currentQuestion.type === 'Fill in Blank' && Array.isArray(existingAnswer.textAnswer)) {
        setFillBlanks(existingAnswer.textAnswer);
      }
    } else if (currentDraft) {
      // Restore from draft if no saved answer
      if (
        (currentQuestion.type === 'Short Answer' || currentQuestion.type === 'Subjective') &&
        currentDraft.type === currentQuestion.type &&
        typeof currentDraft.textAnswer === 'string'
      ) {
        setTextAnswer(currentDraft.textAnswer);
      }
      if (
        currentQuestion.type === 'Fill in Blank' &&
        currentDraft.type === 'Fill in Blank' &&
        Array.isArray(currentDraft.textAnswer)
      ) {
        setFillBlanks(currentDraft.textAnswer);
      }
    }
  }, [currentQuestion, currentQuestionIndex, userAnswers, currentDraft]);

  // Auto-save draft on text change (debounced)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (
        ((currentQuestion?.type === 'Short Answer' || currentQuestion?.type === 'Subjective') &&
          textAnswer) ||
        (currentQuestion?.type === 'Fill in Blank' && fillBlanks.some((b) => b))
      ) {
        saveDraftAnswer();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [textAnswer, fillBlanks, currentQuestion, saveDraftAnswer]);

  // Auto-submit when time is up
  React.useEffect(() => {
    if (timeRemaining === 0 && isQuizActive && config.timerEnabled) {
      confirmStop();
    }
  }, [timeRemaining, isQuizActive, config.timerEnabled]);

  const formatTime = (seconds) => {
    if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
      return '00:00';
    }
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNext = () => {
    if (!currentQuestion) return;

    // Save current answer before moving
    if (
      (currentQuestion.type === 'Short Answer' || currentQuestion.type === 'Subjective') &&
      textAnswer.trim()
    ) {
      // ⭐ Save as regular answer (not draft), but DON'T send to AI
      // AI evaluation will happen only at quiz completion
      selectAnswer(0, false, false, textAnswer.trim(), false);
    } else if (currentQuestion.type === 'Fill in Blank' && fillBlanks.some((b) => b.trim())) {
      // ⭐ Save as regular answer (not draft), but DON'T send to AI
      // AI evaluation will happen only at quiz completion
      selectAnswer(0, false, false, fillBlanks, false);
    }
    // MCQ and True/False are handled via handleAnswerSelect which already calls selectAnswer

    // Small delay to ensure answer is saved
    setTimeout(() => {
      nextQuestion();
    }, 50);
  };

  const handlePause = () => {
    setShowPauseModal(true);
    toast('Quiz paused');
  };

  const confirmPause = async () => {
    setIsPausingQuiz(true);
    try {
      await pauseQuiz();
      setShowPauseModal(false);
      onNavigate('home');
      toast.success('Quiz progress saved');
    } catch (err) {
      toast.error('Failed to pause quiz');
    } finally {
      setIsPausingQuiz(false);
    }
  };

  const handleStop = () => {
    setShowStopModal(true);
  };

  const confirmStop = async () => {
    console.log('DEBUG: Confirm stop called, current userAnswers:', userAnswers);
    console.log('DEBUG: Current quiz questions:', quiz?.questions);
    console.log('DEBUG: Current question index:', currentQuestionIndex);

    setIsStoppingQuiz(true);
    try {
      let finalAnswers = [...userAnswers];

      // Save current question's answer if not already saved
      if (currentQuestion && !finalAnswers[currentQuestionIndex]) {
        console.log('DEBUG: Current question not answered, checking type:', currentQuestion.type);
        console.log('DEBUG: Current textAnswer:', textAnswer);
        console.log('DEBUG: Current fillBlanks:', fillBlanks);
        console.log('DEBUG: Current selectedAnswer:', selectedAnswer);

        if (
          (currentQuestion.type === 'Short Answer' || currentQuestion.type === 'Subjective') &&
          textAnswer.trim()
        ) {
          console.log('DEBUG: Adding Short Answer/Subjective answer');
          finalAnswers[currentQuestionIndex] = {
            questionId: currentQuestion.id,
            questionType: currentQuestion.type,
            selectedOption: 0,
            isCorrect: false, // ⭐ Will be evaluated by AI
            timeSpent: 30,
            totalTimeWhenAnswered: timeRemaining,
            textAnswer: textAnswer.trim(),
            autoSelected: false,
            isDraft: false,
            aiEvaluated: false, // ⭐ Mark as not evaluated yet
          };
        } else if (currentQuestion.type === 'Fill in Blank' && fillBlanks.some((b) => b.trim())) {
          console.log('DEBUG: Adding Fill in Blank answer');
          finalAnswers[currentQuestionIndex] = {
            questionId: currentQuestion.id,
            questionType: 'Fill in Blank',
            selectedOption: 0,
            isCorrect: false, // ⭐ Will be evaluated by AI
            timeSpent: 30,
            totalTimeWhenAnswered: timeRemaining,
            textAnswer: fillBlanks,
            autoSelected: false,
            isDraft: false,
            aiEvaluated: false, // ⭐ Mark as not evaluated yet
          };
        } else if (
          (currentQuestion.type === 'MCQ' || currentQuestion.type === 'True/False') &&
          selectedAnswer
        ) {
          console.log('DEBUG: Adding MCQ/TrueFalse answer');
          finalAnswers[currentQuestionIndex] = {
            questionId: currentQuestion.id,
            questionType: currentQuestion.type,
            selectedOption: selectedAnswer.optionIndex,
            isCorrect: selectedAnswer.isCorrect, // ⭐ Already evaluated locally
            timeSpent: 30,
            totalTimeWhenAnswered: timeRemaining,
            textAnswer: null,
            autoSelected: false,
            isDraft: false,
          };
        }
      }

      console.log('DEBUG: Final answers before stopQuiz:', finalAnswers);
      console.log('DEBUG: Calling stopQuiz with answers:', finalAnswers);

      // ⭐ stopQuiz will batch-evaluate all AI questions
      const results = await stopQuiz(finalAnswers);

      if (results) {
        console.log('DEBUG: Quiz completed results:', results);
        setQuizResults(results);
        setShowStopModal(false);
        setAITask('feedback');
        setShowAIProcessing(true);

        setTimeout(() => {
          setShowAIProcessing(false);
        }, 2000);

        toast.success('Quiz completed! Generating results...');
      }
    } catch (error) {
      console.error('DEBUG: Error in confirmStop:', error);
    } finally {
      setIsStoppingQuiz(false);
    }
  };

  const handleAnswerSelect = (optionIndex, isCorrect, autoSelected = false, textAnswer = null) => {
    if (selectedAnswer && !autoSelected && config.immediateFeedback) return;
    selectAnswer(optionIndex, isCorrect, autoSelected, textAnswer, false);
  };

  const hasAnswer = () => {
    if (!currentQuestion) return false;

    if (currentQuestion.type === 'MCQ' || currentQuestion.type === 'True/False') {
      return selectedAnswer != null && selectedAnswer.optionIndex != null;
    }
    if (currentQuestion.type === 'Short Answer' || currentQuestion.type === 'Subjective') {
      return textAnswer.trim() !== '';
    }
    if (currentQuestion.type === 'Fill in Blank') {
      return fillBlanks.some((blank) => blank.trim() !== '');
    }
    return false;
  };

  const getQuestionTypeDisplay = () => {
    if (!currentQuestion || !currentQuestion.type) return 'Multiple Choice';

    const type = currentQuestion.type;
    switch (type) {
      case 'MCQ':
        return 'Multiple Choice';
      case 'True/False':
        return 'True/False';
      case 'Short Answer':
        return 'Short Answer';
      case 'Subjective':
        return 'Short Answer';
      case 'Fill in Blank':
        return 'Fill in the Blank';
      default:
        return 'Question';
    }
  };

  /**
   * Validates fill in blank answers
   */
  const validateFillInBlank = (fillBlanks, acceptableAnswers) => {
    if (!Array.isArray(acceptableAnswers) || acceptableAnswers.length === 0) {
      console.warn('No acceptable answers defined for fill in blank');
      return false;
    }

    if (!Array.isArray(fillBlanks)) {
      console.warn('Fill blanks is not an array');
      return false;
    }

    return acceptableAnswers.some((acceptableSet) => {
      if (!Array.isArray(acceptableSet)) {
        console.warn('Acceptable answer set is not an array', acceptableSet);
        return false;
      }

      return acceptableSet.every((acceptable, index) => {
        if (typeof acceptable !== 'string') return false;
        if (typeof fillBlanks[index] !== 'string') return false;

        return fillBlanks[index].toLowerCase().trim() === acceptable.toLowerCase().trim();
      });
    });
  };

  /**
   * Renders question content based on type with safety checks
   */
  const renderQuestionContent = () => {
    if (!currentQuestion) {
      return (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-yellow-800">No question data available</p>
        </div>
      );
    }

    switch (currentQuestion.type) {
      case 'MCQ':
        return renderMCQ();

      case 'True/False':
        return renderTrueFalse();

      case 'Fill in Blank':
        return renderFillInBlank();

      case 'Short Answer':
      case 'Subjective':
        return renderShortAnswer();

      default:
        return (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-yellow-800">⚠️ Unknown question type: {currentQuestion.type}</p>
            <p className="text-sm text-yellow-700 mt-2">{currentQuestion.question}</p>
          </div>
        );
    }
  };

  const renderMCQ = () => {
    if (!Array.isArray(currentQuestion.options) || currentQuestion.options.length === 0) {
      return (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-700">⚠️ Invalid question: No options available</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {currentQuestion.options.map((option, index) => {
          // Validate option
          if (!option || typeof option !== 'object') {
            console.warn(`Invalid option at index ${index}`, option);
            return null;
          }

          const optionText =
            typeof option.text === 'string'
              ? option.text
              : typeof option === 'string'
                ? option
                : `Option ${index + 1}`;

          const isCorrect = typeof option.isCorrect === 'boolean' ? option.isCorrect : false;
          const isSelected = selectedAnswer?.optionIndex === index;

          return (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index, isCorrect)}
              disabled={selectedAnswer !== null && config.immediateFeedback}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 ${
                isSelected
                  ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-orange-50 shadow-lg scale-[1.02]'
                  : 'border-white/50 bg-white/60 hover:border-amber-200 hover:bg-white/80'
              } backdrop-blur-sm ${
                selectedAnswer !== null && config.immediateFeedback
                  ? 'cursor-not-allowed opacity-50'
                  : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                    isSelected ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-base ${
                    isSelected ? 'text-amber-700 font-medium' : 'text-slate-700'
                  } flex-1 min-w-0 break-words`}
                >
                  {optionText}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderTrueFalse = () => {
    const trueOption = currentQuestion.options?.[0];
    const falseOption = currentQuestion.options?.[1];

    if (!trueOption || !falseOption) {
      return (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-700">⚠️ Invalid True/False question structure</p>
        </div>
      );
    }

    const trueIsCorrect = typeof trueOption.isCorrect === 'boolean' ? trueOption.isCorrect : false;
    const falseIsCorrect =
      typeof falseOption.isCorrect === 'boolean' ? falseOption.isCorrect : false;

    return (
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleAnswerSelect(0, trueIsCorrect)}
          disabled={selectedAnswer !== null && config.immediateFeedback}
          className={`p-8 rounded-2xl border-2 transition-all duration-300 ${
            selectedAnswer?.optionIndex === 0
              ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg scale-[1.02]'
              : 'border-white/50 bg-white/60 hover:border-green-200 hover:bg-white/80'
          } backdrop-blur-sm ${
            selectedAnswer !== null && config.immediateFeedback
              ? 'cursor-not-allowed opacity-50'
              : ''
          }`}
        >
          <svg
            className="w-10 h-10 mx-auto mb-3 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span
            className={`text-lg ${
              selectedAnswer?.optionIndex === 0 ? 'text-green-700 font-semibold' : 'text-slate-700'
            }`}
          >
            True
          </span>
        </button>

        <button
          onClick={() => handleAnswerSelect(1, falseIsCorrect)}
          disabled={selectedAnswer !== null && config.immediateFeedback}
          className={`p-8 rounded-2xl border-2 transition-all duration-300 ${
            selectedAnswer?.optionIndex === 1
              ? 'border-red-500 bg-gradient-to-br from-red-50 to-pink-50 shadow-lg scale-[1.02]'
              : 'border-white/50 bg-white/60 hover:border-red-200 hover:bg-white/80'
          } backdrop-blur-sm ${
            selectedAnswer !== null && config.immediateFeedback
              ? 'cursor-not-allowed opacity-50'
              : ''
          }`}
        >
          <svg
            className="w-10 h-10 mx-auto mb-3 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span
            className={`text-lg ${
              selectedAnswer?.optionIndex === 1 ? 'text-red-700 font-semibold' : 'text-slate-700'
            }`}
          >
            False
          </span>
        </button>
      </div>
    );
  };

  const renderFillInBlank = () => {
    const questionText =
      typeof currentQuestion.question === 'string' ? currentQuestion.question : '';

    if (!questionText) {
      return (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-700">⚠️ Invalid question text</p>
        </div>
      );
    }

    const parts = questionText.split(/(_{3,})/);
    let blankIndex = 0;

    // ⭐ Check if answer exists (for showing it was answered)
    const existingAnswer = userAnswers[currentQuestionIndex];
    const isAnswered = existingAnswer && !existingAnswer.isDraft;

    return (
      <div className="space-y-4">
        <div className="text-lg text-slate-700 leading-relaxed">
          {parts.map((part, index) => {
            if (/_{3,}/.test(part)) {
              const currentBlankIndex = blankIndex;
              blankIndex++;

              return (
                <input
                  key={index}
                  type="text"
                  value={fillBlanks[currentBlankIndex] || ''}
                  onChange={(e) => {
                    const newBlanks = [...fillBlanks];
                    newBlanks[currentBlankIndex] = e.target.value;
                    setFillBlanks(newBlanks);
                  }}
                  // ⭐ NEVER disable Fill in Blank inputs during quiz
                  disabled={false}
                  placeholder="your answer"
                  className="inline-block mx-2 px-4 py-2 bg-white/80 backdrop-blur-sm border-b-2 border-amber-400 focus:border-amber-600 outline-none rounded-lg min-w-[150px] text-center font-medium text-amber-700 placeholder-amber-300"
                />
              );
            }
            return <span key={index}>{part}</span>;
          })}
        </div>

        {/* ⭐ Show indicator that answer was saved (not evaluated) */}
        {isAnswered && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Answer saved • Will be evaluated when you finish the quiz
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderShortAnswer = () => {
    // ⭐ Check if answer exists (for showing it was answered)
    const existingAnswer = userAnswers[currentQuestionIndex];
    const isAnswered = existingAnswer && !existingAnswer.isDraft;

    return (
      <div>
        <textarea
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          // ⭐ NEVER disable Short Answer inputs during quiz
          disabled={false}
          placeholder="Type your answer here..."
          className="w-full p-4 bg-white/80 backdrop-blur-sm border-2 border-white/50 rounded-2xl focus:border-amber-400 outline-none resize-none h-40 text-slate-700 placeholder-slate-400"
        />

        {/* ⭐ Show indicator that answer was saved (not evaluated) */}
        {isAnswered && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Answer saved • Will be evaluated when you finish the quiz
            </p>
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 min-h-screen">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-amber-600 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <p className="text-slate-600 font-medium">Generating your quiz...</p>
            {quizConfig?.topic && (
              <p className="text-slate-500 text-sm mt-2">Topic: {quizConfig.topic}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 min-h-screen">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md mx-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              Oops! Something went wrong
            </h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  clearError();
                  if (quizConfig) {
                    window.location.reload();
                  } else {
                    onNavigate('home');
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200"
              >
                Try Again
              </button>
              <button
                onClick={() => onNavigate('home')}
                className="px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No quiz data
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 min-h-screen">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-slate-600 mb-4">No quiz data available</p>
            <button
              onClick={() => onNavigate('home')}
              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No current question (shouldn't happen but safety check)
  if (!currentQuestion) {
    return (
      <div className="antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 min-h-screen">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-slate-600 mb-4">Current question unavailable</p>
            <button
              onClick={() => {
                if (currentQuestionIndex > 0) {
                  previousQuestion();
                } else {
                  onNavigate('home');
                }
              }}
              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200"
            >
              {currentQuestionIndex > 0 ? 'Go Back' : 'Back to Home'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz results
  if (quizResults) {
    return <QuizResultsPage results={quizResults} onNavigate={onNavigate} />;
  }

  return (
    <div className="antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 min-h-screen">
      <BackgroundEffects />

      {/* Modern Island Header */}
      <header className="fixed h-[4rem] top-4 left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-max">
        <div className="bg-white/80 backdrop-blur-lg h-full rounded-[1.25rem] shadow-lg flex items-center justify-between p-2">
          {/* Left: Logo and Progress */}
          <div className="flex items-center space-x-2.5 pl-3 pr-2 flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">EB</span>
            </div>
            <div className="hidden sm:flex items-center space-x-2">
              <span className="text-xl font-bold text-slate-700">{currentQuestionNumber}</span>
              <span className="text-sm text-slate-500">/ {quiz.totalQuestions}</span>
            </div>
            <div className="sm:hidden">
              <span className="text-lg font-bold text-slate-700">
                {currentQuestionNumber}/{quiz.totalQuestions}
              </span>
            </div>
          </div>

          {/* Center: Timer and Actions */}
          <div className="flex items-center">
            <nav className="flex items-center space-x-1 border-l border-gray-200 ml-2 pl-2">
              {/* Timer */}
              {config.timerEnabled && (
                <div className="hidden md:flex items-center space-x-2 px-4 py-2 rounded-full bg-slate-50">
                  <svg
                    className="w-4 h-4 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm font-mono font-bold text-slate-700">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}

              {/* Timer - Mobile */}
              {config.timerEnabled && (
                <button className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-slate-50">
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {formatTime(timeRemaining)}
                  </span>
                </button>
              )}

              {/* Immediate Feedback Toggle - Desktop */}
              <button
                onClick={toggleImmediateFeedback}
                className="hidden lg:flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:bg-slate-50"
              >
                <span className="text-slate-600">Feedback</span>
                <div
                  className={`w-8 h-5 rounded-full transition-colors ${config.immediateFeedback ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div
                    className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform mt-1 ${config.immediateFeedback ? 'translate-x-4' : 'translate-x-1'}`}
                  />
                </div>
              </button>

              {/* Immediate Feedback Toggle - Mobile */}
              <button
                onClick={toggleImmediateFeedback}
                aria-label="Toggle immediate feedback"
                className="lg:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-50 transition-all duration-200"
              >
                <div
                  className={`w-6 h-4 rounded-full transition-colors ${config.immediateFeedback ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div
                    className={`w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-transform mt-0.75 ${config.immediateFeedback ? 'translate-x-3' : 'translate-x-0.5'}`}
                  />
                </div>
              </button>

              {/* Pause Button - Desktop */}
              <button
                onClick={handlePause}
                className="hidden sm:flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Pause</span>
              </button>

              {/* Pause Button - Mobile */}
              <button
                onClick={handlePause}
                aria-label="Pause quiz"
                className="sm:hidden flex items-center justify-center w-10 h-10 rounded-full text-amber-700 bg-amber-100 hover:bg-amber-200 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>

              {/* Stop Button - Desktop */}
              <button
                onClick={handleStop}
                className="hidden sm:flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium text-red-600 bg-red-100 hover:bg-red-200 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                  />
                </svg>
                <span>Stop</span>
              </button>

              {/* Stop Button - Mobile */}
              <button
                onClick={handleStop}
                aria-label="Stop quiz"
                className="sm:hidden flex items-center justify-center w-10 h-10 rounded-full text-red-600 bg-red-100 hover:bg-red-200 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                  />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Question Navigator */}
      <div className="lg:hidden px-4 pt-24">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 shadow-md border border-white/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700">Question Navigator</h3>
            <button
              onClick={() => setShowMobileNav(!showMobileNav)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg
                className={`w-5 h-5 transform transition-transform ${showMobileNav ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>

          {showMobileNav && (
            <div className="animate-fade-in">
              <div className="overflow-x-auto pb-2">
                <div className="flex space-x-2 min-w-max p-4">
                  {Array.from({ length: quiz.totalQuestions }, (_, idx) => {
                    const questionNumber = idx + 1;
                    const isActive = questionNumber === currentQuestionNumber;
                    const isAnswered = userAnswers[idx] != null;

                    return (
                      <button
                        key={idx}
                        onClick={() => goToQuestion(idx)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-medium transition-all duration-300 flex-shrink-0 ${
                          isActive
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md scale-110'
                            : isAnswered
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {questionNumber}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Compact Legend */}
              <div className="flex items-center justify-center space-x-4 mt-2 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded"></div>
                  <span className="text-slate-600">Current</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                  <span className="text-slate-600">Answered</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-slate-50 border border-slate-200 rounded"></div>
                  <span className="text-slate-600">Pending</span>
                </div>
              </div>
            </div>
          )}

          {!showMobileNav && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">
                {userAnswers.filter((a) => a != null).length} answered •{' '}
                {quiz.totalQuestions - userAnswers.filter((a) => a != null).length} remaining
              </span>
              <span className="text-xs font-medium text-amber-600">
                {Math.round(progress)}% complete
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Quiz Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 lg:pt-24 pt-8 pb-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6 animate-fade-in-up">
            {/* Question Card */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-6 sm:p-8">
              {/* Question Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-3 py-1 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 text-xs sm:text-sm font-medium rounded-full">
                      {getQuestionTypeDisplay()}
                    </span>
                    <div className="w-32 bg-slate-200/50 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                      />
                    </div>
                  </div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 leading-relaxed break-words">
                    {currentQuestion.question}
                  </h2>

                  {/* Tags Display */}
                  {currentQuestion.tags &&
                    Array.isArray(currentQuestion.tags) &&
                    currentQuestion.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {currentQuestion.tags.map((tag, index) => {
                          if (typeof tag !== 'string') return null;
                          return (
                            <span
                              key={index}
                              className="px-2.5 py-1 text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-full border border-blue-200/50"
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    )}
                </div>
                <div className="flex items-center space-x-1 ml-4">
                  <button
                    onClick={toggleBookmark}
                    className={`p-2 sm:p-2.5 rounded-xl transition-all duration-300 ${
                      isBookmarked
                        ? 'text-amber-600 bg-amber-50 shadow-md'
                        : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                    }`}
                  >
                    <svg
                      className="w-4 sm:w-5 h-4 sm:h-5"
                      fill={isBookmarked ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Question Content */}
              <div className="mb-8">{renderQuestionContent()}</div>

              {/* Feedback Section */}
              {showFeedback &&
                selectedAnswer &&
                currentQuestion &&
                // ⭐ Only show feedback for MCQ and True/False
                (currentQuestion.type === 'MCQ' || currentQuestion.type === 'True/False') && (
                  <div className="mb-6">
                    <div
                      className={`border rounded-xl sm:rounded-2xl p-4 sm:p-6 ${
                        selectedAnswer.isCorrect
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3 sm:space-x-4">
                        <div
                          className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                            selectedAnswer.isCorrect ? 'bg-green-100' : 'bg-red-100'
                          }`}
                        >
                          <svg
                            className={`w-4 h-4 sm:w-5 sm:h-5 ${
                              selectedAnswer.isCorrect ? 'text-green-600' : 'text-red-600'
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            {selectedAnswer.isCorrect ? (
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              />
                            ) : (
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              />
                            )}
                          </svg>
                        </div>
                        <div>
                          <h3
                            className={`font-semibold mb-1 sm:mb-2 text-sm sm:text-base ${
                              selectedAnswer.isCorrect ? 'text-green-800' : 'text-red-800'
                            }`}
                          >
                            {selectedAnswer.isCorrect
                              ? 'Correct! Well done! 🎉'
                              : 'Not quite right'}
                          </h3>
                          <p
                            className={`text-xs sm:text-sm ${
                              selectedAnswer.isCorrect ? 'text-green-700' : 'text-red-700'
                            } break-words`}
                          >
                            {currentQuestion.explanation || 'No explanation available.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100">
                <button
                  onClick={previousQuestion}
                  disabled={currentQuestionNumber === 1}
                  className="text-slate-400 hover:text-slate-600 font-medium transition-colors duration-300 order-2 sm:order-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous Question
                </button>

                <button
                  onClick={isLastQuestion ? confirmStop : handleNext}
                  disabled={
                    (config.questionTimer > 0 && !hasAnswer() && !isLastQuestion) || isStoppingQuiz
                  }
                  className={`px-6 sm:px-8 py-3 rounded-2xl font-semibold transition-all duration-300 transform order-1 sm:order-2 w-full sm:w-auto ${
                    (!config.questionTimer || hasAnswer() || isLastQuestion) && !isStoppingQuiz
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg hover:shadow-xl hover:scale-105'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isStoppingQuiz
                    ? 'Finishing Quiz...'
                    : isLastQuestion
                      ? 'Finish Quiz'
                      : 'Next Question'}{' '}
                  →
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Sidebar - Question Navigation */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/50 sticky top-24">
              <h3 className="font-semibold text-slate-900 mb-4">Questions</h3>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: quiz.totalQuestions }, (_, idx) => {
                  const questionNumber = idx + 1;
                  const isActive = questionNumber === currentQuestionNumber;
                  const isAnswered = userAnswers[idx] != null;

                  return (
                    <button
                      key={idx}
                      onClick={() => goToQuestion(idx)}
                      className={`aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md scale-110'
                          : isAnswered
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {questionNumber}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded"></div>
                  <span className="text-slate-600">Current</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                  <span className="text-slate-600">Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-slate-50 border border-slate-200 rounded"></div>
                  <span className="text-slate-600">Not Visited</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* AI Processing Feedback */}
      <AIProcessingFeedback
        isVisible={showAIProcessing || isEvaluating}
        task={isEvaluating ? 'evaluation' : aiTask}
        evaluationProgress={evaluationProgress}
        onComplete={() => {
          setShowAIProcessing(false);
        }}
      />

      {/* Pause Modal */}
      <Modal
        isOpen={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        title="Quiz Paused"
        icon={
          <svg className="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        }
      >
        <p className="text-gray-600 mb-6">
          Your progress has been saved. You can resume anytime from where you left off.
        </p>
        <div className="flex flex-col space-y-3">
          <Button
            onClick={() => setShowPauseModal(false)}
            disabled={isPausingQuiz}
            className="w-full"
            variant="primary"
          >
            Resume Quiz
          </Button>
          <Button
            onClick={confirmPause}
            loading={isPausingQuiz}
            disabled={isPausingQuiz}
            variant="secondary"
            className="w-full"
          >
            {isPausingQuiz ? 'Pausing...' : 'Back to Home'}
          </Button>
        </div>
      </Modal>

      {/* Stop Modal */}
      <Modal
        isOpen={showStopModal}
        onClose={() => setShowStopModal(false)}
        title="Stop Quiz?"
        icon={
          <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h12v12H6z" />
          </svg>
        }
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to stop this quiz? Your current progress will be saved, but the quiz
          will end.
        </p>
        <div className="flex flex-col space-y-3">
          <Button
            onClick={confirmStop}
            loading={isStoppingQuiz}
            disabled={isStoppingQuiz}
            variant="danger"
            className="w-full"
          >
            {isStoppingQuiz ? 'Stopping...' : 'Yes, Stop Quiz'}
          </Button>
          <Button
            onClick={() => setShowStopModal(false)}
            disabled={isStoppingQuiz}
            variant="secondary"
            className="w-full"
          >
            Continue Quiz
          </Button>
        </div>
      </Modal>

      {/* Custom Styles */}
      <QuizStyles />
    </div>
  );
};

export default QuizPage;
