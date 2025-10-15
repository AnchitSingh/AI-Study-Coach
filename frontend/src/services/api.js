// src/api.js
import geminiAPI from './geminiAPI';
import { generateId } from '../utils/helpers';
import storage from '../utils/storage';

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEYS = {
  ACTIVE_QUIZZES: 'activeQuizzes',
  QUIZ_PROGRESS: 'quizProgress',
  EVALUATION_HISTORY: 'evaluationHistory',
  STUDY_ANALYTICS: 'studyAnalytics',
  BOOKMARKS: 'bookmarks',
  PAUSED_QUIZZES: 'pausedQuizzes',
  TOPIC_ATTEMPTS: 'topicAttempts',
  USER_PROFILE: 'userProfile',
};

const QUESTION_TYPES = {
  MCQ: 'MCQ',
  TRUE_FALSE: 'True/False',
  SHORT_ANSWER: 'Short Answer',
  FILL_IN_BLANK: 'Fill in Blank',
  SUBJECTIVE: 'Subjective',
};

const QUESTION_TYPE_BREAKDOWN_KEYS = {
  MCQ: 'MCQ',
  TRUE_FALSE: 'TrueFalse',
  FILL_UP: 'FillUp',
  SUBJECTIVE: 'Subjective',
};

const TOPIC_CATEGORIES = {
  STRONG: 0.7,
  MODERATE: 0.4,
};

const MAX_HISTORY_LENGTH = 20;
const RECENCY_DECAY_FACTOR = 0.02;
const MIN_RECENCY_WEIGHT = 0.5;
const DIFFICULTY_WEIGHTS = {
  hard: 1.5,
  medium: 1.2,
  easy: 1.0,
};

const TREND_THRESHOLD = 0.1;
const TIME_RANGES = {
  SEVEN_DAYS: 7 * 24 * 60 * 60 * 1000,
  THIRTY_DAYS: 30 * 24 * 60 * 60 * 1000,
};

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Creates a standardized success response
 */
const createSuccessResponse = (data) => ({
  success: true,
  data,
  error: null,
});

/**
 * Creates a standardized error response
 */
const createErrorResponse = (error) => ({
  success: false,
  data: null,
  error: typeof error === 'string' ? error : error.message,
});

// ============================================================================
// QUESTION TYPE NORMALIZATION
// ============================================================================

/**
 * Normalizes question type strings to standard format
 */
const normalizeQuestionType = (type) => {
  if (!type) return QUESTION_TYPES.MCQ;

  const cleanType = String(type)
    .toLowerCase()
    .replace(/[\s/_-]/g, '');

  if (cleanType === 'mcq') return QUESTION_TYPES.MCQ;
  if (cleanType === 'truefalse') return QUESTION_TYPES.TRUE_FALSE;
  if (cleanType.includes('subjective') || cleanType.includes('shortanswer')) {
    return QUESTION_TYPES.SHORT_ANSWER;
  }
  if (cleanType.includes('fillup') || cleanType.includes('fillinblank')) {
    return QUESTION_TYPES.FILL_IN_BLANK;
  }

  return QUESTION_TYPES.MCQ;
};

/**
 * Normalizes question type for breakdown statistics
 */
const normalizeQuestionTypeForBreakdown = (type) => {
  if (!type) return null;

  const cleanType = String(type)
    .toLowerCase()
    .replace(/[\s/_-]/g, '');

  if (cleanType.includes('mcq') || cleanType === 'mcq') {
    return QUESTION_TYPE_BREAKDOWN_KEYS.MCQ;
  }
  if (cleanType.includes('truefalse') || cleanType.includes('true')) {
    return QUESTION_TYPE_BREAKDOWN_KEYS.TRUE_FALSE;
  }
  if (cleanType.includes('fillup') || cleanType.includes('fillinblank')) {
    return QUESTION_TYPE_BREAKDOWN_KEYS.FILL_UP;
  }
  if (cleanType.includes('subjective') || cleanType.includes('shortanswer')) {
    return QUESTION_TYPE_BREAKDOWN_KEYS.SUBJECTIVE;
  }

  return QUESTION_TYPE_BREAKDOWN_KEYS.MCQ;
};

// ============================================================================
// JSON EXTRACTION
// ============================================================================

/**
 * Extracts JSON from AI response (handles markdown code blocks)
 */
const extractJsonFromResponse = (str) => {
  const match = str.match(/```json\n([\s\S]*?)\n```/);
  if (match?.[1]) {
    return match[1];
  }

  const firstBrace = str.indexOf('{');
  const lastBrace = str.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    return null;
  }

  return str.substring(firstBrace, lastBrace + 1);
};

// ============================================================================
// QUESTION PROCESSING
// ============================================================================

/**
 * Processes question options based on question type
 */
const transformQuestion = (question, index) => {
  return {
    ...question,
    id: question.id || generateId(`q${index}`),
  };
};

// ============================================================================
// MAIN API CLASS
// ============================================================================

class AiStudyCoachAPI {
  constructor() {
    this.isProduction = true;
    this._isDataLoaded = false;

    this._initializeDataStores();
  }

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  _initializeDataStores() {
    this.activeQuizzes = new Map();
    this.quizProgress = new Map();
    this.evaluationHistory = new Map();
    this.studyAnalytics = new Map();
    this.bookmarks = new Map();
    this.pausedQuizzes = new Map();
    this.topicAttempts = new Map();
  }

  async _loadData() {
    if (this._isDataLoaded) return;

    try {
      const [
        activeQuizzes,
        quizProgress,
        evaluationHistory,
        studyAnalytics,
        bookmarks,
        pausedQuizzes,
        topicAttempts,
      ] = await Promise.all([
        storage.get(STORAGE_KEYS.ACTIVE_QUIZZES, []),
        storage.get(STORAGE_KEYS.QUIZ_PROGRESS, []),
        storage.get(STORAGE_KEYS.EVALUATION_HISTORY, []),
        storage.get(STORAGE_KEYS.STUDY_ANALYTICS, []),
        storage.get(STORAGE_KEYS.BOOKMARKS, []),
        storage.get(STORAGE_KEYS.PAUSED_QUIZZES, []),
        storage.get(STORAGE_KEYS.TOPIC_ATTEMPTS, []),
      ]);

      this.activeQuizzes = new Map(activeQuizzes);
      this.quizProgress = new Map(quizProgress);
      this.evaluationHistory = new Map(evaluationHistory);
      this.studyAnalytics = new Map(studyAnalytics);
      this.bookmarks = new Map(bookmarks);
      this.pausedQuizzes = new Map(pausedQuizzes);
      this.topicAttempts = new Map(topicAttempts);

      this._isDataLoaded = true;
    } catch (error) {
      console.error('Failed to load persistent data:', error);
    }
  }

  async _saveToStorage(key, map) {
    await storage.set(key, Array.from(map.entries()));
  }

  // --------------------------------------------------------------------------
  // GEMINI AI INTEGRATION
  // --------------------------------------------------------------------------

  async getAIStatus() {
    try {
      const response = await geminiAPI.getApiStatus();
      if (response.success && response.data.model_configured) {
        return createSuccessResponse({ available: true, status: 'available' });
      } else {
        return createSuccessResponse({
          available: false,
          status: 'unavailable',
          detail: 'Backend model not configured.',
        });
      }
    } catch (error) {
      console.error('AI Status Check Failed:', error);
      return createErrorResponse(error);
    }
  }

  async initializeAI() {
    // This function is now simpler, as we don't need to handle model downloads.
    // We can just check the backend status.
    return await this.getAIStatus();
  }

  // --------------------------------------------------------------------------
  // QUIZ GENERATION
  // --------------------------------------------------------------------------

  async generateQuiz(config, onProgress) {
    await this._loadData();

    try {
      const aiResult = await this._generateQuizWithAI(config, onProgress);
      const quiz = this._createQuizObject(config, aiResult);

      this.activeQuizzes.set(quiz.id, quiz);
      await this._saveToStorage(STORAGE_KEYS.ACTIVE_QUIZZES, this.activeQuizzes);

      return createSuccessResponse(quiz);
    } catch (error) {
      console.error('Gemini AI Quiz Generation Error:', error);
      return createErrorResponse(error);
    }
  }

  async createPracticeQuiz(config) {
    await this._loadData();
    try {
      const validQuestions = config.questions || [];

      const quiz = {
        id: `practice_${Date.now()}`,
        title: config.title || 'Practice Quiz',
        subject: config.subject || 'Mixed',
        totalQuestions: validQuestions.length,
        config: this._createQuizConfig(config),
        questions: validQuestions,
        createdAt: new Date().toISOString(),
        timeLimit: config.totalTimer || null,
      };

      this.activeQuizzes.set(quiz.id, quiz);
      await this._saveToStorage(STORAGE_KEYS.ACTIVE_QUIZZES, this.activeQuizzes);

      return createSuccessResponse(quiz);
    } catch (error) {
      return createErrorResponse(error);
    }
  }

  async registerQuiz(quiz) {
    await this._loadData();
    if (!quiz || !quiz.id) {
      return createErrorResponse('Invalid quiz object provided for registration.');
    }
    this.activeQuizzes.set(quiz.id, quiz);
    await this._saveToStorage(STORAGE_KEYS.ACTIVE_QUIZZES, this.activeQuizzes);
    return createSuccessResponse(quiz);
  }

  async _generateQuizWithAI(config, onProgress) {
    const startTime = performance.now();

    if (onProgress) {
      onProgress({ status: 'calling_api', message: 'Generating quiz with Gemini...' });
    }

    const aiResult = await geminiAPI.generateQuiz({
      extractedSource: this._prepareQuizSource(config),
      config: this._prepareQuizConfig(config),
    });

    if (onProgress) {
      onProgress({ status: 'parsing_response', message: 'Processing AI response...' });
    }

    const duration = Math.round(performance.now() - startTime);

    return {
      questions: aiResult.questions,
      generationTime: duration,
    };
  }

  // Helper function to distribute total questions among different types
  _distributeQuestions(questionTypes, totalQuestionCount) {
    if (!Array.isArray(questionTypes) || questionTypes.length === 0) {
      return [{ type: 'MCQ', count: totalQuestionCount }];
    }

    // Normalize types to match what the AI functions expect
    const normalizedTypes = questionTypes.map((type) => {
      if (type.toLowerCase().includes('fill') || type.toLowerCase().includes('blank')) {
        return 'FillUp';
      } else if (
        type.toLowerCase().includes('subjective') ||
        type.toLowerCase().includes('short')
      ) {
        return 'Subjective';
      } else if (type.toLowerCase().includes('mcq')) {
        return 'MCQ';
      } else if (type.toLowerCase().includes('true') || type.toLowerCase().includes('false')) {
        return 'TrueFalse';
      } else {
        return type; // Default to original type
      }
    });

    // Calculate base count per type
    const baseCount = Math.floor(totalQuestionCount / normalizedTypes.length);
    const remainder = totalQuestionCount % normalizedTypes.length;

    return normalizedTypes.map((type, index) => ({
      type,
      count: baseCount + (index < remainder ? 1 : 0),
    }));
  }

  _prepareQuizSource(config) {
    const text =
      config.context || config.extractedSource?.text || config.sourceValue || 'General knowledge';

    return {
      title: config.topic || config.extractedSource?.title || 'Quiz Topic',
      text,
      chunks: config.extractedSource?.chunks || [
        {
          id: 'chunk_1',
          text,
          start: 0,
          end: text.length,
          tokenEstimate: 1,
        },
      ],
    };
  }

  _prepareQuizConfig(config) {
    return {
      questionCount: config.questionCount || 5,
      difficulty: config.difficulty || 'medium',
      questionTypes: config.questionTypes || ['MCQ'],
      immediateFeedback: config.immediateFeedback !== false,
    };
  }

  async _consumeStream(stream, onProgress) {
    let jsonString = '';
    let chunkCount = 0;

    for await (const chunk of stream) {
      jsonString += chunk;
      chunkCount++;

      if (onProgress) {
        onProgress({ status: 'streaming', receivedChunks: chunkCount });
      }
    }

    return jsonString;
  }

  _createQuizObject(config, aiResult) {
    const transformedQuestions = (aiResult.questions || []).map(transformQuestion);

    return {
      id: generateId(),
      title: config.title || `AI Generated Quiz - ${new Date().toLocaleDateString()}`,
      description: config.description || 'Quiz generated using Gemini AI',
      questions: transformedQuestions,
      totalQuestions: transformedQuestions.length,
      config: this._createQuizConfig(config),
      createdAt: new Date().toISOString(),
      metadata: {
        source: 'gemini-ai',
        model: 'gemini-nano',
        generationTime: aiResult.generationTime,
        questionCount: transformedQuestions.length,
      },
    };
  }

  _createQuizConfig(config) {
    return {
      immediateFeedback: config.immediateFeedback,
      timerEnabled: config.timerEnabled,
      totalTimer: config.totalTimer,
      timeLimit: config.timeLimit,
      questionTimer: config.questionTimer,
      showAnswers: config.showAnswers !== false,
      allowRetake: config.allowRetake !== false,
      difficulty: config.difficulty || 'medium',
      subject: config.subject || config.topic || 'General',
      questionCount: config.questionCount || 5,
      questionTypes: config.questionTypes || ['MCQ'],
    };
  }

  // --------------------------------------------------------------------------
  // STORY GENERATION
  // --------------------------------------------------------------------------

  async getStory(config) {
    await this._loadData();

    const aiStatus = await this.getAIStatus();
    if (!aiStatus.data.available) {
      return createErrorResponse('AI is not available');
    }

    try {
      const result = await geminiAPI.getStory(config);
      return createSuccessResponse(result.story);
    } catch (error) {
      console.error('Gemini API Story Generation Error:', error);
      return createErrorResponse(error);
    }
  }

  // --------------------------------------------------------------------------
  // QUIZ OPERATIONS
  // --------------------------------------------------------------------------

  async getActiveQuiz(quizId) {
    await this._loadData();

    const quiz = this.activeQuizzes.get(quizId) || this.pausedQuizzes.get(quizId);

    return quiz ? createSuccessResponse(quiz) : createErrorResponse('Quiz not found');
  }

  async saveQuizProgress(quizId, progress) {
    await this._loadData();
    if (!this.isProduction) {
      return createSuccessResponse({ saved: true });
    }

    try {
      this.pausedQuizzes.set(quizId, {
        ...progress,
        lastUpdated: new Date().toISOString(),
      });

      await this._saveToStorage(STORAGE_KEYS.PAUSED_QUIZZES, this.pausedQuizzes);

      this.activeQuizzes.delete(quizId);
      await this._saveToStorage(STORAGE_KEYS.ACTIVE_QUIZZES, this.activeQuizzes);

      return createSuccessResponse({ saved: true });
    } catch (error) {
      return createErrorResponse(error);
    }
  }

  async completeQuiz(quizId, answers, quiz) {
    await this._loadData();

    try {
      const results = this._calculateQuizResults(quizId, answers, quiz);

      await this._trackTopicPerformance(answers, quiz);

      this.quizProgress.set(quizId, { ...results, completed: true });
      await this._saveToStorage(STORAGE_KEYS.QUIZ_PROGRESS, this.quizProgress);

      this.activeQuizzes.delete(quizId);
      await this._saveToStorage(STORAGE_KEYS.ACTIVE_QUIZZES, this.activeQuizzes);

      return createSuccessResponse(results);
    } catch (error) {
      return createErrorResponse(error);
    }
  }

  _calculateQuizResults(quizId, answers, quiz) {
    const totalQuestions = quiz?.questions?.length || 0;
    const answeredQuestions = answers?.length || 0;
    const score = answers?.filter((a) => a?.isCorrect).length || 0;
    const totalScore =
      answers?.reduce((sum, a) => sum + (a?.score || (a?.isCorrect ? 1 : 0)), 0) || 0;

    return {
      quizId,
      totalQuestions,
      answeredQuestions,
      score,
      totalScore,
      percentage: totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0,
      timeSpent: 0,
      completedAt: new Date().toISOString(),
      answers: answers || [],
    };
  }

  async getQuizResults(quizId) {
    try {
      const progress = this.quizProgress.get(quizId);
      const quiz = this.activeQuizzes.get(quizId);

      if (!progress || !quiz) {
        return createErrorResponse('Quiz or progress data not found');
      }

      const results = {
        quizId,
        totalQuestions: quiz.questions.length,
        answeredQuestions: Object.keys(progress.answers || {}).length,
        correctAnswers: 0,
        totalScore: 0,
        percentage: 0,
        timeSpent: progress.timeSpent || 0,
        completedAt: progress.completedAt || null,
        answers: progress.answers || {},
        feedback: [],
      };

      for (const answerData of Object.values(progress.answers || {})) {
        if (answerData.isCorrect === true) {
          results.correctAnswers++;
        }
        results.totalScore += answerData.score || 0;
      }

      results.percentage =
        quiz.questions.length > 0
          ? Math.round((results.correctAnswers / quiz.questions.length) * 100)
          : 0;

      return createSuccessResponse(results);
    } catch (error) {
      return createErrorResponse(error);
    }
  }

  async removePausedQuiz(quizId) {
    await this._loadData();

    try {
      const removed = this.pausedQuizzes.delete(quizId);
      await this._saveToStorage(STORAGE_KEYS.PAUSED_QUIZZES, this.pausedQuizzes);
      return createSuccessResponse({ removed });
    } catch (error) {
      return createErrorResponse(error);
    }
  }

  async getPausedQuizzes() {
    await this._loadData();
    return createSuccessResponse(Array.from(this.pausedQuizzes.values()));
  }

  // --------------------------------------------------------------------------
  // ANSWER SUBMISSION & EVALUATION
  // --------------------------------------------------------------------------

  async submitAnswer(quizId, questionId, answer) {
    await this._loadData();

    try {
      const quiz = this.activeQuizzes.get(quizId);
      if (!quiz) {
        return createErrorResponse(`Quiz ${quizId} not found`);
      }

      const question = quiz.questions.find((q) => q.id === questionId);
      if (!question) {
        return createErrorResponse(`Question ${questionId} not found in quiz ${quizId}`);
      }

      return await this._evaluateAnswer(question, answer);
    } catch (error) {
      return createErrorResponse(error);
    }
  }

  async _evaluateAnswer(question, answer) {
    const isObjectiveType =
      question.type === QUESTION_TYPES.MCQ || question.type === QUESTION_TYPES.TRUE_FALSE;

    if (isObjectiveType) {
      return this._evaluateObjectiveAnswer(question, answer);
    }

    return await this._evaluateSubjectiveAnswer(question, answer);
  }

  _evaluateObjectiveAnswer(question, answer) {
    const isCorrect = answer === question.correctAnswer;

    const result = {
      isCorrect,
      correctAnswer: question.correctAnswer,
      feedback: {
        message: isCorrect ? 'Correct!' : 'Incorrect.',
        explanation: question.explanation || 'No explanation provided.',
      },
      explanation: question.explanation || '',
      score: isCorrect ? 1.0 : 0.0,
    };
    return createSuccessResponse(result);
  }

  async _evaluateSubjectiveAnswer(question, answer) {
    try {
      const startTime = performance.now();

      const evaluation = await geminiAPI.evaluateSubjective({
        question,
        userAnswer: answer.textAnswer,
      });

      const duration = Math.round(performance.now() - startTime);

      return createSuccessResponse({
        isCorrect: evaluation.isCorrect,
        score: evaluation.isCorrect ? 1.0 : 0.0,
        feedback: {
          message: evaluation.feedback || (evaluation.isCorrect ? 'Correct!' : 'Not quite right'),
          explanation: evaluation.explanation || 'No feedback provided',
        },
        explanation: evaluation.explanation || 'No explanation provided',
        metadata: {
          evaluationTime: duration,
          evaluatedBy: 'gemini-api',
        },
      });
    } catch (error) {
      console.error('AI Evaluation Error:', error);
      return createSuccessResponse(this._getFallbackEvaluation(error));
    }
  }

  _getFallbackEvaluation(error) {
    return {
      isCorrect: null,
      score: 0.5,
      feedback: {
        message: 'Answer submitted but could not be evaluated automatically.',
        explanation: 'Manual review may be required.',
      },
      explanation: 'Automatic evaluation failed. Please review manually.',
      metadata: {
        error: error.message,
        fallback: true,
      },
    };
  }

  // --------------------------------------------------------------------------
  // BOOKMARKS
  // --------------------------------------------------------------------------

  async addBookmark(questionId, bookmarkData) {
    await this._loadData();

    try {
      const bookmark = {
        id: generateId('bookmark'),
        questionId,
        ...bookmarkData,
        createdAt: new Date().toISOString(),
      };

      this.bookmarks.set(questionId, bookmark);
      await this._saveToStorage(STORAGE_KEYS.BOOKMARKS, this.bookmarks);

      return createSuccessResponse(bookmark);
    } catch (error) {
      return createErrorResponse(error);
    }
  }

  async removeBookmark(questionId) {
    await this._loadData();

    try {
      const removed = this.bookmarks.delete(questionId);
      await this._saveToStorage(STORAGE_KEYS.BOOKMARKS, this.bookmarks);
      return createSuccessResponse({ removed });
    } catch (error) {
      return createErrorResponse(error);
    }
  }

  async getBookmarks() {
    await this._loadData();
    return createSuccessResponse(Array.from(this.bookmarks.values()));
  }

  // --------------------------------------------------------------------------
  // TOPIC PERFORMANCE TRACKING
  // --------------------------------------------------------------------------

  async _trackTopicPerformance(answers, quiz) {
    if (!answers || !quiz?.questions) return;

    try {
      for (let i = 0; i < answers.length; i++) {
        const answer = answers[i];
        const question = quiz.questions[i];

        if (!answer || !question) continue;

        const tags = question.tags || [];
        for (const tag of tags) {
          await this._updateTopicData(tag, answer, question);
        }
      }

      await this._saveToStorage(STORAGE_KEYS.TOPIC_ATTEMPTS, this.topicAttempts);
    } catch (error) {
      console.error('Error tracking topic performance:', error);
    }
  }

  async _updateTopicData(tag, answer, question) {
    const topicKey = tag.toLowerCase().trim();
    if (!topicKey) return;

    let topicData = this.topicAttempts.get(topicKey) || {
      attempts: 0,
      correct: 0,
      totalScore: 0,
      accuracyHistory: [],
      difficultyHistory: [],
      timestamps: [],
    };

    topicData.attempts += 1;
    if (answer.isCorrect) {
      topicData.correct += 1;
    }
    topicData.totalScore += answer.score || (answer.isCorrect ? 1 : 0);

    const accuracy = (topicData.correct / topicData.attempts) * 100;
    topicData.accuracyHistory.push({
      accuracy,
      date: new Date().toISOString(),
      isCorrect: answer.isCorrect,
    });

    if (question.difficulty) {
      topicData.difficultyHistory.push({
        difficulty: question.difficulty,
        isCorrect: answer.isCorrect,
        date: new Date().toISOString(),
      });
    }

    topicData.timestamps.push(new Date().toISOString());

    topicData = this._limitHistoryLength(topicData);
    this.topicAttempts.set(topicKey, topicData);
  }

  _limitHistoryLength(topicData) {
    const limit = MAX_HISTORY_LENGTH;

    return {
      ...topicData,
      accuracyHistory: topicData.accuracyHistory.slice(-limit),
      difficultyHistory: topicData.difficultyHistory.slice(-limit),
      timestamps: topicData.timestamps.slice(-limit),
    };
  }

  _calculateTopicWeightedScore(topicData) {
    if (!topicData || topicData.attempts === 0) return 0;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (let i = 0; i < topicData.accuracyHistory.length; i++) {
      const attempt = topicData.accuracyHistory[i];
      const weight = this._calculateAttemptWeight(attempt, topicData.difficultyHistory[i]);

      const attemptScore = attempt.isCorrect ? 1 : 0;
      totalWeightedScore += attemptScore * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  }

  _calculateAttemptWeight(attempt, difficultyData) {
    let weight = 1;

    // Difficulty factor
    if (difficultyData?.difficulty) {
      weight *= DIFFICULTY_WEIGHTS[difficultyData.difficulty] || 1.0;
    }

    // Recency factor
    const date = new Date(attempt.date);
    const daysSince = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.max(MIN_RECENCY_WEIGHT, 1.0 - daysSince * RECENCY_DECAY_FACTOR);
    weight *= recencyFactor;

    return weight;
  }

  _calculateTopicTrend(topicData) {
    if (!topicData || topicData.accuracyHistory.length < 2) {
      return 'stable';
    }

    const recentAttempts = topicData.accuracyHistory.slice(-5);
    if (recentAttempts.length < 2) return 'stable';

    const recentAccuracies = recentAttempts.map((attempt) => (attempt.isCorrect ? 1 : 0));
    const midPoint = Math.ceil(recentAccuracies.length / 2);

    const firstHalf = recentAccuracies.slice(0, midPoint);
    const secondHalf = recentAccuracies.slice(midPoint);

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (avgSecond > avgFirst + TREND_THRESHOLD) return 'improving';
    if (avgSecond < avgFirst - TREND_THRESHOLD) return 'declining';
    return 'stable';
  }

  async _getTopicPerformance() {
    const topics = Array.from(this.topicAttempts.entries());

    const result = {
      strong: [],
      moderate: [],
      weak: [],
    };

    for (const [topicName, topicData] of topics) {
      const weightedScore = this._calculateTopicWeightedScore(topicData);
      const trend = this._calculateTopicTrend(topicData);
      const accuracy = (topicData.correct / topicData.attempts) * 100;

      const topicInfo = {
        name: topicName,
        accuracy,
        attempts: topicData.attempts,
        trend,
      };

      if (weightedScore >= TOPIC_CATEGORIES.STRONG) {
        result.strong.push(topicInfo);
      } else if (weightedScore >= TOPIC_CATEGORIES.MODERATE) {
        result.moderate.push(topicInfo);
      } else {
        result.weak.push(topicInfo);
      }
    }

    // Sort by accuracy (descending)
    const sortByAccuracy = (a, b) => b.accuracy - a.accuracy;
    result.strong.sort(sortByAccuracy);
    result.moderate.sort(sortByAccuracy);
    result.weak.sort(sortByAccuracy);

    return result;
  }

  // --------------------------------------------------------------------------
  // STATISTICS & ANALYTICS
  // --------------------------------------------------------------------------

  async getGlobalStats(timeRange = 'all') {
    await this._loadData();

    try {
      const completedQuizzes = this._getCompletedQuizzes(timeRange);
      const overallStats = this._calculateOverallStats(completedQuizzes);
      const streakInfo = await this._getStreakInfo();
      const questionTypesBreakdown = await this._getQuestionTypeBreakdown();
      const topicPerformance = await this._getTopicPerformance();

      const stats = {
        ...overallStats,
        activeStreak: streakInfo.activeStreak,
        longestStreak: streakInfo.longestStreak,
        questionTypesBreakdown,
        topicPerformance,
        lastActive: streakInfo.lastActive,
      };

      return createSuccessResponse(stats);
    } catch (error) {
      console.error('Error getting global stats:', error);
      return createErrorResponse(error);
    }
  }

  _getCompletedQuizzes(timeRange) {
    const allCompleted = Array.from(this.quizProgress.values()).filter((quiz) => quiz.completed);

    if (timeRange === 'all') {
      return allCompleted;
    }

    const cutoffDate = this._getCutoffDate(timeRange);
    if (!cutoffDate) {
      return allCompleted;
    }

    return allCompleted.filter((quiz) => new Date(quiz.completedAt) >= cutoffDate);
  }

  _getCutoffDate(timeRange) {
    const now = new Date();

    if (timeRange === '7d') {
      return new Date(now.getTime() - TIME_RANGES.SEVEN_DAYS);
    }
    if (timeRange === '30d') {
      return new Date(now.getTime() - TIME_RANGES.THIRTY_DAYS);
    }

    return null;
  }

  _calculateOverallStats(quizzes) {
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalTime = 0;

    for (const quiz of quizzes) {
      totalQuestions += quiz.answers.length;
      totalCorrect += quiz.answers.filter((a) => a?.isCorrect).length;
      totalTime += quiz.timeSpent || 0;
    }

    return {
      totalQuizzes: quizzes.length,
      totalQuestions,
      overallAccuracy: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
      totalTimeSpent: totalTime,
    };
  }

  async _getStreakInfo() {
    const completedQuizzes = Array.from(this.quizProgress.values())
      .filter((quiz) => quiz.completed)
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));

    if (completedQuizzes.length === 0) {
      return { activeStreak: 0, longestStreak: 0, lastActive: null };
    }

    const { currentStreak, maxStreak } = this._calculateStreaks(completedQuizzes);
    const activeStreak = this._calculateActiveStreak(completedQuizzes);

    return {
      activeStreak,
      longestStreak: Math.max(maxStreak, currentStreak),
      lastActive: completedQuizzes[completedQuizzes.length - 1].completedAt,
    };
  }

  _calculateStreaks(completedQuizzes) {
    let currentStreak = 1;
    let maxStreak = 1;
    let lastDate = this._normalizeDate(new Date(completedQuizzes[0].completedAt));

    for (let i = 1; i < completedQuizzes.length; i++) {
      const quizDate = this._normalizeDate(new Date(completedQuizzes[i].completedAt));
      const diffDays = Math.floor((quizDate - lastDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
      } else if (diffDays > 1) {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }

      lastDate = quizDate;
    }

    return { currentStreak, maxStreak };
  }

  _calculateActiveStreak(completedQuizzes) {
    const today = this._normalizeDate(new Date());
    const lastQuizDate = this._normalizeDate(
      new Date(completedQuizzes[completedQuizzes.length - 1].completedAt)
    );

    const daysSinceLast = Math.floor((today - lastQuizDate) / (1000 * 60 * 60 * 24));

    if (daysSinceLast > 1) {
      return 0;
    }

    let activeStreak = 0;
    let checkDate = daysSinceLast === 1 ? new Date(today) : new Date(today);
    checkDate.setDate(checkDate.getDate() - (daysSinceLast === 1 ? 1 : 0));

    for (let i = completedQuizzes.length - 1; i >= 0; i--) {
      const quizDate = this._normalizeDate(new Date(completedQuizzes[i].completedAt));

      if (quizDate.getTime() === checkDate.getTime()) {
        activeStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (quizDate.getTime() < checkDate.getTime()) {
        const prevDay = new Date(checkDate);
        prevDay.setDate(prevDay.getDate() - 1);

        if (quizDate.getTime() === prevDay.getTime()) {
          activeStreak++;
          checkDate = prevDay;
        } else {
          break;
        }
      }
    }

    return activeStreak;
  }

  _normalizeDate(date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  async _getQuestionTypeBreakdown() {
    const completedQuizzes = Array.from(this.quizProgress.values()).filter(
      (quiz) => quiz.completed
    );

    const typeData = Object.fromEntries(
      Object.values(QUESTION_TYPE_BREAKDOWN_KEYS).map((key) => [key, { count: 0, correct: 0 }])
    );

    for (const quiz of completedQuizzes) {
      if (!quiz.answers) continue;

      for (const answer of quiz.answers) {
        if (!answer?.questionType) continue;

        const normalizedType = normalizeQuestionTypeForBreakdown(answer.questionType);
        if (normalizedType && typeData[normalizedType]) {
          typeData[normalizedType].count += 1;
          if (answer.isCorrect) {
            typeData[normalizedType].correct += 1;
          }
        }
      }
    }

    const result = {};
    for (const [type, data] of Object.entries(typeData)) {
      result[type] = {
        count: data.count,
        accuracy: data.count > 0 ? (data.correct / data.count) * 100 : 0,
      };
    }

    return result;
  }

  async getQuizFeedback(quizMeta, stats) {
    try {
      const aiStatus = await this.getAIStatus();
      if (!aiStatus.data.available) {
        return 'AI is currently unavailable.';
      }

      const result = await geminiAPI.getQuizFeedback({ quizMeta, stats });
      return result.feedback;
    } catch (error) {
      console.error('AI Feedback Error:', error);
      return 'Sorry, I was unable to generate feedback at this time.';
    }
  }

  async *_getFallbackFeedbackStream() {
    yield 'AI feedback is currently unavailable.';
  }

  async getQuizRecommendations(quizMeta, stats) {
    return createSuccessResponse(this._getDefaultRecommendations());
  }

  _getDefaultRecommendations() {
    return {
      recommendations: [
        {
          topic: 'General Study',
          reason: 'AI is unavailable, using general recommendations',
          suggested_count: 3,
          types: ['MCQ'],
        },
      ],
    };
  }

  // --------------------------------------------------------------------------
  // USER PROFILE
  // --------------------------------------------------------------------------

  async getUserProfile() {
    await this._loadData();

    const profileData = await storage.get(STORAGE_KEYS.USER_PROFILE);

    if (profileData) {
      return createSuccessResponse(profileData);
    }

    const defaultProfile = {
      name: 'Study Enthusiast',
      email: 'ai.coach@no_email.com',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    return createSuccessResponse(defaultProfile);
  }

  // --------------------------------------------------------------------------
  // DEBUG UTILITIES
  // --------------------------------------------------------------------------

  async getDebugInfo() {
    await this._loadData();

    return createSuccessResponse({
      isProduction: this.isProduction,
      activeQuizzes: Array.from(this.activeQuizzes.keys()),
      progressEntries: Array.from(this.quizProgress.keys()),
      studyPlans: Array.from(this.studyAnalytics.keys()),
      bookmarks: Array.from(this.bookmarks.keys()),
      pausedQuizzes: Array.from(this.pausedQuizzes.keys()),
      timestamp: new Date().toISOString(),
    });
  }

  async clearDebugData() {
    this._initializeDataStores();
    this._isDataLoaded = true;

    await Promise.all(Object.values(STORAGE_KEYS).map((key) => storage.remove(key)));

    return createSuccessResponse({ cleared: true });
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

const aiStudyCoachAPI = new AiStudyCoachAPI();

export const {
  generateQuiz,
  getStory,
  getActiveQuiz,
  saveQuizProgress,
  submitAnswer,
  getQuizResults,
  completeQuiz,
  addBookmark,
  removeBookmark,
  removePausedQuiz,
  getAIStatus,
  initializeAI,
  getDebugInfo,
  clearDebugData,
  getUserProfile,
  getPausedQuizzes,
  getBookmarks,
  getQuizFeedback,
  getQuizRecommendations,
  getGlobalStats,
  createPracticeQuiz,
  registerQuiz,
} = aiStudyCoachAPI;

export default aiStudyCoachAPI;
