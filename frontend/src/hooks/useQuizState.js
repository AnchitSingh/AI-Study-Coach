import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import aiStudyCoachAPI from '../services/api';
import { normalizeQuizData, validateNormalizedQuiz } from '../utils/dataNormalizer';
import { validateQuiz } from '../utils/schema';

const useQuizState = (quizConfig = null, answerRef) => {
    const [quiz, setQuiz] = useState(null);
    const [config, setConfig] = useState(quizConfig || {
        immediateFeedback: true,
        timerEnabled: true,
        totalTimer: 600,
        questionTimer: 60
    });

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState([]);
    const [timeRemaining, setTimeRemaining] = useState(quizConfig?.timerEnabled ? (quizConfig.totalTimer || 600) : 0);
    const [isQuizActive, setIsQuizActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [bookmarkedQuestions, setBookmarkedQuestions] = useState(new Set());
    const [showFeedback, setShowFeedback] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [draftAnswers, setDraftAnswers] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluationProgress, setEvaluationProgress] = useState({ current: 0, total: 0 });

    const timerRef = useRef(null);
    const quizIdRef = useRef(null);
    const abortControllerRef = useRef(null);
    const currentQuestionIndexRef = useRef(0);
    const autoSaveTimerRef = useRef(null);
    const isMountedRef = useRef(true);
    const userAnswersRef = useRef([]);

    // Keep refs in sync
    useEffect(() => {
        currentQuestionIndexRef.current = currentQuestionIndex;
    }, [currentQuestionIndex]);

    useEffect(() => {
        userAnswersRef.current = userAnswers;
    }, [userAnswers]);

    // Load bookmarks on initial load
    useEffect(() => {
        let isMounted = true;

        const loadBookmarks = async () => {
            try {
                const response = await aiStudyCoachAPI.getBookmarks();
                if (isMounted && response.success && Array.isArray(response.data)) {
                    setBookmarkedQuestions(new Set(response.data.map(b => b.questionId)));
                }
            } catch (err) {
                if (isMounted) {
                    console.error('Failed to load bookmarks:', err);
                }
            }
        };

        loadBookmarks();

        return () => {
            isMounted = false;
        };
    }, []);

    // Initialize quiz when config changes
    useEffect(() => {
        if (!quizConfig || quiz) return;

        // Handle pre-generated quiz data
        if (quizConfig.quizData) {
            try {
                const rawQuiz = quizConfig.quizData;

                // Validate before using
                if (!validateQuiz(rawQuiz)) {
                    console.error('Pre-generated quiz failed validation:', rawQuiz);
                    setError('Received invalid quiz data. Please try generating a new quiz.');
                    setIsLoading(false);
                    return;
                }

                const normalizedQuiz = normalizeQuizData(rawQuiz);

                const validation = validateNormalizedQuiz(normalizedQuiz);
                if (!validation.valid) {
                    console.error('Normalized quiz validation failed:', validation.error);
                    setError(`Quiz data error: ${validation.error}`);
                    setIsLoading(false);
                    return;
                }

                setQuiz(normalizedQuiz);
                setConfig(prevConfig => ({ ...prevConfig, ...normalizedQuiz.config }));
                setTimeRemaining(normalizedQuiz.timeLimit || normalizedQuiz.config?.totalTimer || 600);
                setIsQuizActive(true);
                quizIdRef.current = normalizedQuiz.id;
                setIsLoading(false);
                toast.success('Quiz ready!');
            } catch (err) {
                console.error('Error loading pre-generated quiz:', err);
                setError('Failed to load quiz data. Please try again.');
                setIsLoading(false);
            }
            return;
        }

        // Load existing quiz by ID
        if (quizConfig.quizId) {
            loadExistingQuiz(quizConfig.quizId);
            return;
        }

        // Generate new quiz
        if (quizConfig.questions || quizConfig.topic) {
            initializeQuiz(quizConfig);
            return;
        }

    }, [quizConfig, quiz]);

    // Handle existing answers when question changes
    useEffect(() => {
        const timer = setTimeout(() => {
            const existingAnswer = userAnswers[currentQuestionIndex];
            const currentQ = quiz?.questions?.[currentQuestionIndex];

            if (existingAnswer && currentQ) {
                setSelectedAnswer({
                    optionIndex: existingAnswer.selectedOption,
                    isCorrect: existingAnswer.isCorrect,
                    textAnswer: existingAnswer.textAnswer,
                    aiEvaluated: existingAnswer.aiEvaluated
                });

                // ⭐ CRITICAL FIX: Only show feedback for MCQ/True-False
                // Fill in Blank and Short Answer should NEVER show feedback during quiz
                const shouldShowFeedback =
                    config.immediateFeedback &&
                    !existingAnswer.isPending &&
                    (currentQ.type === 'MCQ' || currentQ.type === 'True/False');

                setShowFeedback(shouldShowFeedback);
            } else {
                setSelectedAnswer(null);
                setShowFeedback(false);
            }
        }, 50);

        return () => clearTimeout(timer);
    }, [currentQuestionIndex, userAnswers, config.immediateFeedback, quiz]);
    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            if (timerRef.current) clearInterval(timerRef.current);
            if (abortControllerRef.current) abortControllerRef.current.abort();
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, []);

    const initializeQuiz = async (config) => {
        // Validate config
        if (!config || (!config.questions && !config.topic)) {
            const errorMsg = 'Invalid quiz configuration: missing questions or topic';
            setError(errorMsg);
            toast.error(errorMsg);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            let response;

            // Practice quiz from bookmarks
            if (Array.isArray(config.questions) && config.questions.length > 0) {
                response = await aiStudyCoachAPI.createPracticeQuiz(config);
            } else {
                // Generate new quiz from AI
                response = await aiStudyCoachAPI.generateQuiz(config);
            }

            if (!isMountedRef.current) return;

            if (!response || !response.success) {
                throw new Error(response?.error || 'Failed to generate quiz');
            }

            const rawQuiz = response.data;

            // Validate raw quiz data
            if (!validateQuiz(rawQuiz)) {
                throw new Error('Generated quiz failed validation. Please try again.');
            }

            // Normalize the quiz data
            const normalizedQuiz = normalizeQuizData(rawQuiz);

            // Validate normalized quiz
            const validation = validateNormalizedQuiz(normalizedQuiz);
            if (!validation.valid) {
                throw new Error(`Quiz normalization failed: ${validation.error}`);
            }

            setQuiz(normalizedQuiz);
            setConfig(prevConfig => ({ ...prevConfig, ...normalizedQuiz.config }));
            setTimeRemaining(normalizedQuiz.timeLimit || normalizedQuiz.config?.totalTimer || config.totalTimer || 600);
            setIsQuizActive(true);
            quizIdRef.current = normalizedQuiz.id;
            setUserAnswers(new Array(normalizedQuiz.questions.length).fill(null));
            toast.success('Quiz started successfully');

        } catch (err) {
            console.error('Error initializing quiz:', err);
            if (isMountedRef.current) {
                const errorMessage = err.message || 'Failed to generate quiz';
                setError(errorMessage);
                toast.error(errorMessage);
            }
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    };

    const loadExistingQuiz = async (quizId) => {
        if (!quizId) {
            setError('No quiz ID provided');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const response = await aiStudyCoachAPI.getActiveQuiz(quizId);

            if (!isMountedRef.current) return;

            if (!response || !response.success) {
                throw new Error(response?.error || 'Failed to load quiz');
            }

            const savedState = response.data;

            // Validate before normalizing
            if (!validateQuiz(savedState)) {
                throw new Error('Loaded quiz data is invalid');
            }

            const normalizedQuiz = normalizeQuizData(savedState);

            const validation = validateNormalizedQuiz(normalizedQuiz);
            if (!validation.valid) {
                throw new Error(`Loaded quiz validation failed: ${validation.error}`);
            }

            // Re-register the quiz as active before setting the state
            await aiStudyCoachAPI.registerQuiz(normalizedQuiz);

            setQuiz({
                id: normalizedQuiz.id,
                title: normalizedQuiz.title,
                subject: normalizedQuiz.subject,
                questions: normalizedQuiz.questions,
                totalQuestions: normalizedQuiz.totalQuestions,
            });

            setConfig(prevConfig => ({ ...prevConfig, ...normalizedQuiz.config }));
            setCurrentQuestionIndex(savedState.currentQuestionIndex || 0);
            setUserAnswers(Array.isArray(savedState.userAnswers) ? savedState.userAnswers : []);
            setTimeRemaining(savedState.timeRemaining || normalizedQuiz.config?.totalTimer || 600);

            if (Array.isArray(savedState.bookmarkedQuestions)) {
                setBookmarkedQuestions(new Set(savedState.bookmarkedQuestions));
            }

            if (savedState.draftAnswers && typeof savedState.draftAnswers === 'object') {
                setDraftAnswers(savedState.draftAnswers);
            }

            setIsPaused(false);
            setIsQuizActive(true);
            quizIdRef.current = quizId;

            await aiStudyCoachAPI.removePausedQuiz(quizId);
            toast.success('Quiz loaded successfully');

        } catch (err) {
            console.error('Error loading quiz:', err);
            if (isMountedRef.current) {
                const errorMessage = err.message || 'Failed to load quiz';
                setError(errorMessage);
                toast.error(errorMessage);
            }
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    };

    const stopQuiz = useCallback(async (finalAnswers = null) => {
        console.log('DEBUG: stopQuiz function called with finalAnswers:', finalAnswers);

        if (isSubmitting) {
            console.log('DEBUG: Quiz is already submitting, returning null');
            return null;
        }

        try {
            setIsSubmitting(true);
            setIsQuizActive(false);
            setIsPaused(false);

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }

            let answersToSubmit = [...(finalAnswers || userAnswersRef.current)];

            // ⭐ Find ALL Fill in Blank and Short Answer questions that need AI evaluation
            const answersToEvaluate = [];
            for (let i = 0; i < answersToSubmit.length; i++) {
                const answer = answersToSubmit[i];
                if (!answer) continue;

                const question = quiz?.questions?.[i];
                if (!question) continue;

                // ⭐ Evaluate if:
                // 1. It's a Fill in Blank or Short Answer question
                // 2. Has not been evaluated yet (aiEvaluated is false/undefined)
                // 3. Has a textAnswer
                const needsEvaluation =
                    !answer.aiEvaluated &&
                    (question.type === 'Fill in Blank' ||
                        question.type === 'Short Answer' ||
                        question.type === 'Subjective') &&
                    answer.textAnswer;

                console.log(`DEBUG: Answer ${i} evaluation check:`, {
                    questionType: question.type,
                    notAlreadyEvaluated: !answer.aiEvaluated,
                    hasTextAnswer: !!answer.textAnswer,
                    needsEvaluation
                });

                if (needsEvaluation) {
                    console.log(`DEBUG: Adding answer ${i} for AI evaluation:`, { index: i, answer, question });
                    answersToEvaluate.push({ index: i, answer, question });
                } else {
                    console.log(`DEBUG: Answer ${i} does not need evaluation`);
                }
            }

            // Evaluate answers if needed
            if (answersToEvaluate.length > 0) {

                setIsEvaluating(true);
                setEvaluationProgress({ current: 0, total: answersToEvaluate.length });

                for (const [index, item] of answersToEvaluate.entries()) {
                    const { index: answerIndex, answer, question } = item;
                    setEvaluationProgress({ current: index + 1, total: answersToEvaluate.length });



                    try {
                        const response = await aiStudyCoachAPI.submitAnswer(quizIdRef.current, question.id, answer);

                        if (response && response.success && response.data) {
                            answersToSubmit[answerIndex] = {
                                ...answer,
                                isCorrect: Boolean(response.data.isCorrect),
                                score: typeof response.data.score === 'number' ? response.data.score : 0,
                                feedback: response.data.feedback || { message: 'Evaluated' },
                                explanation: response.data.explanation || '',
                                aiEvaluated: true,
                                isPending: false,
                            };

                        }
                    } catch (e) {
                        console.error(`❌ Failed to evaluate question ${answerIndex + 1}:`, e);
                        // Keep answer as is (will be marked incorrect)
                    }
                }

                setIsEvaluating(false);

            }

            // Filter out invalid answers
            const validAnswers = answersToSubmit.filter(answer =>
                answer && !answer.isDraft && typeof answer === 'object'
            );

            const response = await aiStudyCoachAPI.completeQuiz(
                quizIdRef.current,
                validAnswers,
                quiz
            );

            if (response && response.success && response.data) {
                return {
                    ...response.data,
                    quiz: quiz,
                    config: config
                };
            } else {
                throw new Error(response?.error || 'Failed to complete quiz');
            }
        } catch (err) {
            console.error('Error completing quiz:', err);
            if (isMountedRef.current) {
                const errorMsg = err.message || 'Failed to complete quiz';
                setError(errorMsg);
                toast.error(errorMsg);
            }
            return null;
        } finally {
            if (isMountedRef.current) {
                setIsSubmitting(false);
            }
        }
    }, [quiz, config, isSubmitting]);

    // Timer with auto-submission
    useEffect(() => {
        if (!isQuizActive || !config.timerEnabled || isPaused) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        timerRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }

                    setTimeout(() => {
                        if (!isMountedRef.current) return;

                        let finalAnswers = [...userAnswersRef.current];

                        // Save current answer if exists
                        if (answerRef?.current && quiz?.questions?.[currentQuestionIndexRef.current]) {
                            const { textAnswer, fillBlanks, selectedAnswer } = answerRef.current;
                            const currentQ = quiz.questions[currentQuestionIndexRef.current];

                            if (!finalAnswers[currentQuestionIndexRef.current]) {
                                if ((currentQ.type === 'Short Answer' || currentQ.type === 'Subjective') && textAnswer?.trim()) {
                                    finalAnswers[currentQuestionIndexRef.current] = {
                                        questionId: currentQ.id,
                                        questionType: currentQ.type,
                                        selectedOption: 0,
                                        isCorrect: false, // ⭐ Will be evaluated by AI
                                        timeSpent: 30,
                                        totalTimeWhenAnswered: 0,
                                        textAnswer: textAnswer.trim(),
                                        autoSelected: true,
                                        isDraft: false,
                                        aiEvaluated: false // ⭐ Mark as not evaluated
                                    };
                                } else if (currentQ.type === 'Fill in Blank' && Array.isArray(fillBlanks) && fillBlanks.some(b => b?.trim())) {
                                    finalAnswers[currentQuestionIndexRef.current] = {
                                        questionId: currentQ.id,
                                        questionType: 'Fill in Blank',
                                        selectedOption: 0,
                                        isCorrect: false, // ⭐ Will be evaluated by AI
                                        timeSpent: 30,
                                        totalTimeWhenAnswered: 0,
                                        textAnswer: fillBlanks,
                                        autoSelected: true,
                                        isDraft: false,
                                        aiEvaluated: false // ⭐ Mark as not evaluated
                                    };
                                }
                            }
                        }

                        // ⭐ stopQuiz will evaluate all AI questions
                        stopQuiz(finalAnswers).then(results => {
                            if (results) {
                                toast.success('Time\'s up! Quiz submitted automatically.');
                            }
                        });
                    }, 100);

                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [isQuizActive, config.timerEnabled, isPaused, quiz, stopQuiz]);

    const currentQuestion = quiz?.questions?.[currentQuestionIndex] || null;
    const isLastQuestion = currentQuestionIndex === (quiz?.questions?.length - 1) || false;
    const currentQuestionNumber = currentQuestionIndex + 1;

    const saveDraftAnswer = useCallback(() => {
        if (!answerRef?.current || !quiz?.questions) return;

        const { textAnswer, fillBlanks } = answerRef.current;
        const currentQ = quiz.questions[currentQuestionIndexRef.current];

        if (!currentQ) return;

        if ((currentQ.type === 'Short Answer' || currentQ.type === 'Subjective') && textAnswer?.trim()) {
            setDraftAnswers(prev => ({
                ...prev,
                [currentQuestionIndexRef.current]: {
                    type: currentQ.type,
                    textAnswer: textAnswer.trim()
                }
            }));
        } else if (currentQ.type === 'Fill in Blank' && Array.isArray(fillBlanks) && fillBlanks.some(b => b?.trim())) {
            setDraftAnswers(prev => ({
                ...prev,
                [currentQuestionIndexRef.current]: {
                    type: 'Fill in Blank',
                    textAnswer: fillBlanks
                }
            }));
        }
    }, [quiz]);

    const selectAnswer = useCallback(async (optionIndex, isCorrect, autoSelected = false, textAnswer = null, isDraft = false) => {
        try {
            const newController = new AbortController();

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = newController;

            const currentQIndex = currentQuestionIndexRef.current;
            const currentQ = quiz?.questions?.[currentQIndex];

            if (!currentQ) {
                console.warn('No current question found');
                return;
            }

            const actualTimeSpent = config.questionTimer ? (config.questionTimer - 30) : 30;

            const answer = {
                questionId: currentQ.id,
                questionType: currentQ.type || 'MCQ',
                selectedOption: typeof optionIndex === 'number' ? optionIndex : 0,
                isCorrect: Boolean(isCorrect),
                timeSpent: actualTimeSpent,
                totalTimeWhenAnswered: timeRemaining,
                autoSelected: Boolean(autoSelected),
                textAnswer: textAnswer,
                isDraft: Boolean(isDraft),
                isPending: false
            };

            // Remove from drafts if not a draft
            if (!isDraft && draftAnswers[currentQIndex]) {
                setDraftAnswers(prev => {
                    const newDrafts = { ...prev };
                    delete newDrafts[currentQIndex];
                    return newDrafts;
                });
            }

            setSelectedAnswer({
                optionIndex,
                isCorrect,
                textAnswer
            });

            // Update userAnswers immediately
            setUserAnswers(currentAnswers => {
                const newAnswers = [...currentAnswers];
                newAnswers[currentQIndex] = answer;
                return newAnswers;
            });

            // ⭐ CRITICAL: Only evaluate and show feedback for MCQ/True-False
            const shouldEvaluateImmediately =
                config.immediateFeedback &&
                (currentQ.type === 'MCQ' || currentQ.type === 'True/False');

            if (shouldEvaluateImmediately) {
                setShowFeedback(true);
            } else {
                // ⭐ Clear feedback for AI-evaluated questions
                setShowFeedback(false);
            }

            // ⭐ NEVER send Fill in Blank or Short Answer to AI during quiz
            if (currentQ.type === 'Fill in Blank' ||
                currentQ.type === 'Short Answer' ||
                currentQ.type === 'Subjective') {

                return;
            }

        } catch (err) {
            if (isMountedRef.current) {
                console.error('Error in selectAnswer:', err);
            }
        }
    }, [quiz, config, timeRemaining, draftAnswers]);

    const saveCurrentAnswer = useCallback(() => {
        if (!answerRef?.current || !quiz?.questions) return;

        const { textAnswer, fillBlanks, selectedAnswer } = answerRef.current;
        const currentQ = quiz.questions[currentQuestionIndex];

        if (!currentQ) return;

        // Only save if not already saved
        if (userAnswers[currentQuestionIndex]) return;

        if ((currentQ.type === 'Short Answer' || currentQ.type === 'Subjective') && textAnswer?.trim()) {
            selectAnswer(0, false, false, textAnswer.trim(), false);
        } else if (currentQ.type === 'Fill in Blank' && Array.isArray(fillBlanks) && fillBlanks.some(b => b?.trim())) {
            selectAnswer(0, false, false, fillBlanks, false);
        }
    }, [quiz, currentQuestionIndex, selectAnswer, userAnswers]);

    const nextQuestion = useCallback(() => {
        if (!isLastQuestion && quiz?.questions) {
            saveCurrentAnswer();

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }

            if (config.immediateFeedback) {
                setShowFeedback(false);
            }

            setCurrentQuestionIndex(prev => Math.min(prev + 1, quiz.questions.length - 1));
        }
    }, [isLastQuestion, saveCurrentAnswer, config.immediateFeedback, quiz]);

    const previousQuestion = useCallback(() => {
        if (currentQuestionIndex > 0) {
            saveCurrentAnswer();

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }

            if (config.immediateFeedback) {
                setShowFeedback(false);
            }

            setCurrentQuestionIndex(prev => Math.max(prev - 1, 0));
        }
    }, [currentQuestionIndex, saveCurrentAnswer, config.immediateFeedback]);

    const goToQuestion = useCallback((questionIndex) => {
        if (!quiz?.questions) return;

        if (questionIndex >= 0 && questionIndex < quiz.questions.length && questionIndex !== currentQuestionIndex) {
            saveCurrentAnswer();

            setTimeout(() => {
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                    abortControllerRef.current = null;
                }

                setCurrentQuestionIndex(questionIndex);
            }, 50);
        }
    }, [quiz, currentQuestionIndex, saveCurrentAnswer]);

    const toggleBookmark = async () => {
        if (!currentQuestion) return;

        try {
            const questionId = currentQuestion.id;
            const isCurrentlyBookmarked = bookmarkedQuestions.has(questionId);

            if (isCurrentlyBookmarked) {
                const response = await aiStudyCoachAPI.removeBookmark(questionId);
                if (response && response.success) {
                    setBookmarkedQuestions(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(questionId);
                        return newSet;
                    });
                    toast.success('Question removed from bookmarks');
                } else {
                    toast.error('Failed to remove bookmark');
                }
            } else {
                const options = Array.isArray(currentQuestion.options) ? currentQuestion.options : [];
                const correctIndex = options.findIndex(opt => opt && opt.isCorrect === true);

                const response = await aiStudyCoachAPI.addBookmark(questionId, {
                    question: currentQuestion.question || '',
                    options: options,
                    type: currentQuestion.type || 'MCQ',
                    correctAnswer: correctIndex >= 0 ? correctIndex : 0,
                    explanation: currentQuestion.explanation || '',
                    subject: currentQuestion.subject || 'General',
                    difficulty: currentQuestion.difficulty || 'medium',
                    tags: Array.isArray(currentQuestion.tags) ? currentQuestion.tags : [],
                    quizTitle: quiz?.title || 'Untitled Quiz',
                    answer: currentQuestion.answer
                });

                if (response && response.success) {
                    setBookmarkedQuestions(prev => new Set(prev).add(questionId));
                    toast.success('Question bookmarked successfully');
                } else {
                    toast.error('Failed to bookmark question');
                }
            }
        } catch (err) {
            console.error('Error toggling bookmark:', err);
            if (isMountedRef.current) {
                toast.error('Failed to update bookmark');
            }
        }
    };

    const pauseQuiz = async () => {
        try {
            saveCurrentAnswer();

            setIsPaused(true);
            setIsQuizActive(false);

            const score = {
                correct: userAnswers.filter(a => a && a.isCorrect && !a.isDraft && !a.isPending).length,
                total: userAnswers.filter(a => a && !a.isDraft && !a.isPending).length
            };

            const quizState = {
                quizId: quizIdRef.current,
                id: quizIdRef.current,
                title: quiz?.title || 'Quiz',
                subject: quiz?.subject || 'General',
                questions: quiz?.questions || [],
                totalQuestions: quiz?.questions?.length || 0,
                progress: Math.round(getProgress()),
                currentQuestion: currentQuestionIndex + 1,
                difficulty: config.difficulty || 'medium',
                score: score,
                currentQuestionIndex,
                userAnswers,
                draftAnswers,
                timeRemaining,
                bookmarkedQuestions: Array.from(bookmarkedQuestions),
                config,
                pausedAt: new Date().toISOString()
            };

            const response = await aiStudyCoachAPI.saveQuizProgress(quizIdRef.current, quizState);

            if (!response || !response.success) {
                throw new Error(response?.error || 'Failed to save progress');
            }
        } catch (err) {
            console.error('Error pausing quiz:', err);
            if (isMountedRef.current) {
                const errorMsg = err.message || 'Failed to save quiz progress';
                setError(errorMsg);
                toast.error(errorMsg);
            }
        }
    };

    const resumeQuiz = () => {
        setIsPaused(false);
        setIsQuizActive(true);
    };

    const toggleImmediateFeedback = () => {
        const newSetting = !config.immediateFeedback;
        setConfig(prev => ({ ...prev, immediateFeedback: newSetting }));

        if (!newSetting) {
            setShowFeedback(false);
            toast('Immediate feedback turned off');
        } else if (selectedAnswer && !userAnswers[currentQuestionIndex]?.isPending) {
            setShowFeedback(true);
            toast('Immediate feedback turned on');
        }
    };

    const getProgress = () => {
        if (!quiz?.questions) return 0;
        const answeredCount = userAnswers.filter(answer =>
            answer != null && !answer.isDraft && !answer.isPending
        ).length;
        return Math.min(100, (answeredCount / quiz.questions.length) * 100);
    };

    const getCurrentDraft = () => {
        return draftAnswers[currentQuestionIndex] || null;
    };

    return {
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
        bookmarkedQuestions,
        isLastQuestion,
        progress: getProgress(),
        isBookmarked: currentQuestion ? bookmarkedQuestions.has(currentQuestion.id) : false,
        currentDraft: getCurrentDraft(),
        isSubmitting,
        isEvaluating,
        evaluationProgress,
        initializeQuiz,
        loadExistingQuiz,
        selectAnswer,
        nextQuestion,
        previousQuestion,
        toggleBookmark,
        pauseQuiz,
        resumeQuiz,
        stopQuiz,
        toggleImmediateFeedback,
        goToQuestion,
        saveDraftAnswer,
        saveCurrentAnswer,
        clearError: () => setError(null)
    };
};

export default useQuizState;