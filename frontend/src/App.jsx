/**
 * @fileoverview Main application component.
 * 
 * This component serves as the central router and state manager for the AI Study Coach application.
 * It handles navigation between different pages (landing, home, quiz, story, etc.) and manages
 * global application state like user preferences and visited status.
 * 
 * The App component maintains the current page state and navigation data, providing a
 * seamless user experience as they move through the learning flow. It also handles
 * initialization logic for new vs returning users.
 * 
 * @module App
 */

import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { ProfileProvider } from './contexts/ProfileContext';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import QuizPage from './pages/QuizPage';
import BookmarksPage from './pages/BookmarksPage';
import PausedQuizzesPage from './pages/PausedQuizzesPage';
import QuizLoadingPage from './pages/QuizLoadingPage';
import StoryLoadingPage from './pages/StoryLoadingPage';
import StoryPage from './pages/StoryPage';
import GlobalStatsPage from './pages/GlobalStatsPage';
import QuizErrorBoundary from './pages/QuizErrorBoundary';
import './index.css';

/**
 * Main application component that handles routing and global state.
 * 
 * @returns {JSX.Element} The rendered application with appropriate page based on current state
 * 
 * @example
 * <App />
 */
const App = () => {
  /**
   * Current page state - determines which component to render
   * @type {string}
   */
  const [currentPage, setCurrentPage] = useState(() => {
    const hasVisited = localStorage.getItem('aistudycoach_visited');
    return hasVisited ? 'home' : 'landing';
  });

  /**
   * Data passed between pages during navigation
   * @type {Object|null}
   */
  const [navigationData, setNavigationData] = useState(null);

  /**
   * Streaming story content that can be updated without page changes
   * @type {Object|null}
   */
  const [storyContent, setStoryContent] = useState(null);

  /**
   * Flag to track if initialization logic has run
   * @type {boolean}
   */
  const [hasInitialized, setHasInitialized] = useState(false);

  /**
   * Initialize application state on mount
   * Checks localStorage to determine if user has visited before
   */
  React.useEffect(() => {
    if (hasInitialized) return;

    const hasVisited = localStorage.getItem('aistudycoach_visited');

    if (!hasVisited) {
      setCurrentPage('landing');
    } else {
      setCurrentPage('home');
    }

    setHasInitialized(true);
  }, [hasInitialized]);



  /**
   * Navigates to a different page in the application.
   * 
   * Handles navigation between different application views and manages data transfer
   * between pages. Special handling for story streaming updates where content
   * can be updated without changing pages.
   * 
   * @param {string} page - The target page identifier (e.g., 'home', 'quiz', 'story')
   * @param {Object} [data=null] - Optional data to pass to the target page
   * @returns {void}
   * 
   * @example
   * navigateTo('quiz', { quizConfig: { questionCount: 10 } });
   * navigateTo('home');
   */
  const navigateTo = (page, data = null) => {
    if (currentPage === 'landing' && page === 'home') {
      localStorage.setItem('aistudycoach_visited', 'true');
    }

    // Handle story streaming updates without changing pages
    if (currentPage === 'story' && page === 'story' && data?.storyContent) {
      // Update story content without changing page if navigating to same page with new content
      setStoryContent(data.storyContent);
      setNavigationData((prev) => ({ ...prev, ...data }));
      return;
    }

    // Store navigation data
    setNavigationData(data);
    setCurrentPage(page);
  };



  /**
   * Resets the application to its initial state.
   * 
   * Clears localStorage flags, resets initialization status, and returns to
   * the landing page. Used for returning users who want to start fresh.
   * 
   * @returns {void}
   */
  const resetApp = () => {
    localStorage.removeItem('aistudycoach_visited');
    setHasInitialized(false);
    setCurrentPage('landing');
    setNavigationData(null);
  };

  return (
    <ProfileProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#333',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }}
        containerStyle={{
          zIndex: 99999,
        }}
      />

      {currentPage === 'landing' && <LandingPage onGetStarted={() => navigateTo('home')} />}

      {currentPage === 'home' && (
        <HomePage onNavigate={navigateTo} navigationData={navigationData} />
      )}

      {currentPage === 'quiz-loading' && (
        <QuizLoadingPage onNavigate={navigateTo} navigationData={navigationData} />
      )}

      {currentPage === 'story-loading' && (
        <StoryLoadingPage onNavigate={navigateTo} navigationData={navigationData} />
      )}

      {currentPage === 'story' && (
        <StoryPage
          onNavigate={navigateTo}
          storyContent={storyContent || navigationData?.storyContent}
          initialConfig={navigationData?.storyConfig}
          isStreaming={navigationData?.isStreaming}
        />
      )}

      {currentPage === 'quiz' && (
        <QuizErrorBoundary>
          <QuizPage onNavigate={navigateTo} quizConfig={navigationData?.quizConfig} />
        </QuizErrorBoundary>
      )}

      {currentPage === 'bookmarks' && <BookmarksPage onNavigate={navigateTo} />}

      {currentPage === 'paused' && <PausedQuizzesPage onNavigate={navigateTo} />}

      {currentPage === 'stats' && <GlobalStatsPage onNavigate={navigateTo} />}
    </ProfileProvider>
  );
};

export default App;
