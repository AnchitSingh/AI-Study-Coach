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

const App = () => {
  const [currentPage, setCurrentPage] = useState(() => {
    const hasVisited = localStorage.getItem('aistudycoach_visited');
    return hasVisited ? 'home' : 'landing';
  });

  const [navigationData, setNavigationData] = useState(null); // Store navigation data
  const [storyContent, setStoryContent] = useState(null); // Store streaming story content
  const [hasInitialized, setHasInitialized] = useState(false);

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

  React.useEffect(() => {
    // Signal to the background script that the side panel is ready
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'SIDEPANEL_READY' });
    }
  }, []);

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

  React.useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      const messageListener = (message, sender, sendResponse) => {
        if (message.type === 'START_QUIZ_FROM_SELECTION') {
          navigateTo('home', { openQuizSetup: true, selectionText: message.text });
        } else if (message.type === 'START_STORY_FROM_SELECTION') {
          navigateTo('home', { openStorySetup: true, selectionText: message.text });
        }
      };

      chrome.runtime.onMessage.addListener(messageListener);

      return () => {
        chrome.runtime.onMessage.removeListener(messageListener);
      };
    }
  }, [navigateTo]);

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
