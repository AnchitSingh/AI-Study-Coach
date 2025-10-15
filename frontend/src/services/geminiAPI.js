const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
/**
 * Checks the status of the backend API.
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
 * @param {object} config - The quiz configuration.
 * @returns {Promise<object>} The generated quiz data.
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
 * Generates a story by calling the backend and returns a stream.
 * @param {object} config - The story configuration.
 * @returns {Promise<ReadableStream>} The streaming response body.
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
