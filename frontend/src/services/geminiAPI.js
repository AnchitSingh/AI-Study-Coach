/**
 * @fileoverview Gemini AI API client for interfacing with the backend.
 * 
 * This module provides a client interface for communicating with the
 * Gemini AI backend API. It handles all HTTP requests for quiz generation,
 * story creation, answer evaluation, and feedback generation.
 * 
 * The API client includes proper error handling, request/response processing,
 * and follows RESTful conventions for consistent communication with the backend.
 * 
 * @module geminiAPI
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Checks the status of the backend API.
 * 
 * @returns {Promise<Object>} API status response with success flag and data
 * 
 * @example
 * const status = await getApiStatus();
 * if (status.success) {
 *   console.log('API is available');
 * } else {
 *   console.error('API is unavailable:', status.error);
 * }
 */
export async function getApiStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('API status check failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generates a quiz by calling the backend.
 * 
 * @param {Object} config - The quiz configuration
 * @param {Object} config.extractedSource - Source material for quiz generation
 * @param {Object} config.config - Quiz configuration parameters
 * @returns {Promise<Object>} The generated quiz data
 * 
 * @throws {Error} If the request fails or returns an error response
 * 
 * @example
 * const quizConfig = {
 *   extractedSource: {
 *     title: 'World History',
 *     text: 'Content about world history...'
 *   },
 *   config: {
 *     questionCount: 10,
 *     difficulty: 'medium'
 *   }
 * };
 * 
 * try {
 *   const quiz = await generateQuiz(quizConfig);
 *   console.log('Quiz generated:', quiz);
 * } catch (error) {
 *   console.error('Failed to generate quiz:', error);
 * }
 */
export async function generateQuiz(config) {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Quiz generation failed:', error);
    throw error;
  }
}

/**
 * Evaluates a subjective answer by calling the backend.
 * 
 * @param {Object} data - The evaluation data
 * @param {Object} data.question - The question being evaluated
 * @param {string} data.userAnswer - The user's answer to evaluate
 * @returns {Promise<Object>} The evaluation results
 * 
 * @throws {Error} If the request fails or returns an error response
 * 
 * @example
 * const evaluationData = {
 *   question: {
 *     text: 'Explain photosynthesis',
 *     type: 'Short Answer'
 *   },
 *   userAnswer: 'Photosynthesis is the process by which plants convert sunlight to energy.'
 * };
 * 
 * try {
 *   const evaluation = await evaluateSubjective(evaluationData);
 *   console.log('Evaluation result:', evaluation);
 * } catch (error) {
 *   console.error('Failed to evaluate answer:', error);
 * }
 */
export async function evaluateSubjective(data) {
  try {
    const response = await fetch(`${API_BASE_URL}/evaluate-subjective`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Subjective evaluation failed:', error);
    throw error;
  }
}

/**
 * Generates a story by calling the backend.
 * 
 * @param {Object} config - The story configuration
 * @param {string} config.topic - The topic for the story
 * @param {string} config.style - The storytelling style
 * @returns {Promise<Object>} The generated story data
 * 
 * @throws {Error} If the request fails or returns an error response
 * 
 * @example
 * const storyConfig = {
 *   topic: 'The Water Cycle',
 *   style: 'Simple Words'
 * };
 * 
 * try {
 *   const story = await getStory(storyConfig);
 *   console.log('Story generated:', story);
 * } catch (error) {
 *   console.error('Failed to generate story:', error);
 * }
 */
export async function getStory(config) {
  try {
    const response = await fetch(`${API_BASE_URL}/get-story`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Story generation failed:', error);
    throw error;
  }
}

/**
 * Gets quiz feedback by calling the backend.
 * 
 * @param {Object} data - The feedback data
 * @param {Object} data.quizMeta - Quiz metadata
 * @param {Object} data.stats - Quiz statistics
 * @returns {Promise<Object>} The feedback data
 * 
 * @throws {Error} If the request fails or returns an error response
 * 
 * @example
 * const feedbackData = {
 *   quizMeta: { title: 'Math Quiz', subject: 'Algebra' },
 *   stats: { score: 8, total: 10 }
 * };
 * 
 * try {
 *   const feedback = await getQuizFeedback(feedbackData);
 *   console.log('Quiz feedback:', feedback);
 * } catch (error) {
 *   console.error('Failed to get feedback:', error);
 * }
 */
export async function getQuizFeedback(data) {
  try {
    const response = await fetch(`${API_BASE_URL}/get-feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Quiz feedback fetch failed:', error);
    throw error;
  }
}

export default {
  getApiStatus,
  generateQuiz,
  getStory,
  evaluateSubjective,
  getQuizFeedback,
};
