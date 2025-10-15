import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useProfile } from '../contexts/ProfileContext';
import QuizSetupModal from '../components/quiz/QuizSetupModal';
import StorySetupModal from '../components/story/StorySetupModal';
import GlobalHeader from '../components/ui/GlobalHeader';
import aiStudyCoachAPI from '../services/api';
import {
  extractFromCurrentPage,
  extractFromPDFResult,
  normalizeManualTopic,
} from '../utils/contentExtractor';
import { extractTextFromPDF } from '../utils/pdfExtractor';
import { SOURCE_TYPE } from '../utils/messages';
import BackgroundEffects from '../components/ui/BackgroundEffects';

// Empty default topics that will be populated from stats
const DEFAULT_TOPICS = [];

// Utility Functions
const formatTimeAgo = (date) => {
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.floor((now - then) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(date).toLocaleDateString();
};

// Sub-components
const LoadingScreen = () => (
  <div className="antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 min-h-screen">
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-slow">
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
        <p className="text-slate-600">Loading your dashboard...</p>
      </div>
    </div>
  </div>
);

const ScrollCard = ({ card, onClick }) => (
  <div
    className="group relative w-[17.5rem] h-64 rounded-[0.65rem] transition-all duration-300 overflow-hidden transform hover:scale-[1.02] z-10 flex-shrink-0 cursor-pointer"
    style={{ backgroundColor: card.bgColor }}
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyPress={(e) => e.key === 'Enter' && onClick && onClick(card)}
  >
    <div className="w-full h-full rounded-[3rem] flex flex-col justify-evenly">
      <img
        alt={card.title}
        src={card.image}
        className="h-40 mx-auto"
        style={{ transform: `scale(${card.scale})` }}
      />
      <h6 className="text-[1.2rem] font-[700] text-[#68634e]">{card.title}</h6>
    </div>
  </div>
);

const PausedQuizCard = ({ quiz, onContinue }) => (
  <div
    className="group bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-slate-100 hover:border-amber-200 animate-fade-in-up"
    onClick={() => onContinue(quiz.id)}
    role="button"
    tabIndex={0}
    onKeyPress={(e) => e.key === 'Enter' && onContinue(quiz.id)}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <h3 className="font-semibold text-slate-800 group-hover:text-amber-700 transition-colors">
          {quiz.title}
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          {quiz.questionsLeft} questions remaining • {formatTimeAgo(quiz.lastAccessed)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12">
          <svg className="transform -rotate-90 w-12 h-12">
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-slate-200"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - quiz.progress / 100)}`}
              className="text-amber-500 transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-700">
            {quiz.progress}%
          </span>
        </div>
        <svg
          className="w-5 h-5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  </div>
);

const BookmarkCard = ({ bookmark, onOpen }) => (
  <div
    className="group bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-slate-100 hover:border-amber-200 animate-fade-in-up"
    onClick={() => onOpen(bookmark.id)}
    role="button"
    tabIndex={0}
    onKeyPress={(e) => e.key === 'Enter' && onOpen(bookmark.id)}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
          <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 group-hover:text-amber-700 transition-colors">
            {bookmark.title}
          </h3>
          <p className="text-sm text-slate-500">Saved {formatTimeAgo(bookmark.savedAt)}</p>
        </div>
      </div>
      <svg
        className="w-5 h-5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all duration-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </div>
);

const EmptyState = ({ icon, title, message }) => (
  <div className="text-center py-12">
    <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {icon}
      </svg>
    </div>
    <p className="text-slate-600 mb-2 font-medium">{title}</p>
    <p className="text-slate-400 text-sm">{message}</p>
  </div>
);

// Main Component
const HomePage = ({ onNavigate, navigationData }) => {
  const [showQuizSetup, setShowQuizSetup] = useState(false);
  const [showStorySetup, setShowStorySetup] = useState(false);
  const { profile, loading: profileLoading } = useProfile();
  const [pausedQuizzes, setPausedQuizzes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recommendedTopics, setRecommendedTopics] = useState(DEFAULT_TOPICS);
  const [displayContent, setDisplayContent] = useState('continue');

  useEffect(() => {
    if (navigationData?.openQuizSetup) {
      setShowQuizSetup(true);
    }
    if (navigationData?.openStorySetup) {
      setShowStorySetup(true);
    }
    // Handle recommended topic from navigation data
    if (navigationData?.recommendedTopic) {
      // Set timeout to allow modal to open first, then update its state
      setTimeout(() => {
        setShowQuizSetup(true);
      }, 100);
    }
  }, [navigationData]);

  useEffect(() => {
    let mounted = true;

    const loadUserData = async () => {
      try {
        setIsLoading(true);
        const [profileResponse, pausedResponse, bookmarksResponse, statsResponse] =
          await Promise.all([
            aiStudyCoachAPI.getUserProfile(),
            aiStudyCoachAPI.getPausedQuizzes(),
            aiStudyCoachAPI.getBookmarks(),
            aiStudyCoachAPI.getGlobalStats('all'), // Get user stats for recommendations
          ]);

        if (!mounted) return;

        if (pausedResponse.success) setPausedQuizzes(pausedResponse.data);
        if (bookmarksResponse.success) setBookmarks(bookmarksResponse.data);

        // Determine recommended topics based on stats
        if (statsResponse.success && statsResponse.data) {
          const { topicPerformance } = statsResponse.data;

          // Determine order of recommendations: weak -> moderate -> strong
          let topicsToRecommend = [];

          // First, add weak topics
          if (topicPerformance.weak && topicPerformance.weak.length > 0) {
            topicsToRecommend = [...topicPerformance.weak];
          }
          // If no weak topics, add moderate topics
          else if (topicPerformance.moderate && topicPerformance.moderate.length > 0) {
            topicsToRecommend = [...topicPerformance.moderate];
          }
          // If neither weak nor moderate, add strong topics
          else if (topicPerformance.strong && topicPerformance.strong.length > 0) {
            topicsToRecommend = [...topicPerformance.strong];
          }

          // Limit to top 3 topics
          setRecommendedTopics(topicsToRecommend.slice(0, 3).map((topic) => topic.name));
        } else {
          // Fallback to default topics if stats not available
          setRecommendedTopics(DEFAULT_TOPICS);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        if (mounted) {
          toast.error('Unable to load your data. Using offline mode.');
          // Fallback demo data
          setPausedQuizzes([
            {
              id: 'demo1',
              title: 'React Advanced Concepts',
              progress: 60,
              questionsLeft: 4,
              totalQuestions: 10,
              lastAccessed: new Date(Date.now() - 2 * 60 * 60 * 1000),
            },
            {
              id: 'demo2',
              title: 'JavaScript Design Patterns',
              progress: 30,
              questionsLeft: 7,
              totalQuestions: 10,
              lastAccessed: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          ]);
          setBookmarks([
            {
              id: 'b1',
              title: 'React Hooks Guide',
              savedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            },
            {
              id: 'b2',
              title: 'State Management Patterns',
              savedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            },
          ]);
          setRecommendedTopics(DEFAULT_TOPICS);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadUserData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleStartQuiz = (config) => {
    setShowQuizSetup(false);
    onNavigate('quiz-loading', { config });
  };

  const handleStartStory = (config) => {
    setShowStorySetup(false);
    onNavigate('story-loading', { config });
  };

  const handleContinueQuiz = (quizId) => {
    const quiz = pausedQuizzes.find((q) => q.id === quizId);
    if (quiz) {
      toast.success(`Resuming: ${quiz.title}`);
      onNavigate('quiz', { resumeQuizId: quizId });
    }
  };

  const handleOpenBookmark = (bookmarkId) => {
    const bookmark = bookmarks.find((b) => b.id === bookmarkId);
    if (bookmark) {
      toast.success(`Opening: ${bookmark.title}`);
      onNavigate('quiz', { bookmarkId: bookmarkId });
    }
  };

  const handleScrollCardClick = (card) => {
    switch (card.title.toLowerCase()) {
      case 'bookmarks':
        onNavigate('bookmarks');
        break;
      case 'paused quizzes':
        onNavigate('paused');
        break;
      default:
        // For other cards, you can add specific navigation or default behavior
        // Right now we'll default to bookmarks for consistency
        onNavigate('bookmarks');
        break;
    }
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <div className="antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 min-h-screen overflow-x-hidden">
        <BackgroundEffects />
        {/* Minimal Header */}
        <GlobalHeader currentPage="home" onNavigate={onNavigate} />
        <main className="mx-auto pl-4 pr-4 min-h-screen flex flex-col justify-center py-12 pt-24 relative z-10">
          <div className="min-h-[76vh] flex flex-col justify-center">
            {/* Header Section */}
            <div className="text-center mb-12 animate-fade-in">
              <h1 className="text-5xl sm:text-6xl font-display font-bold tracking-tight mb-4">
                <span className="text-slate-800">
                  Welcome back{profile?.name ? `, ${profile.name}` : ''}
                </span>
                <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  .
                </span>
              </h1>
              <p className="text-lg text-slate-500">What would you like to learn today?</p>
            </div>

            {/* Main CTA Button */}
            <div className="flex justify-center mb-12 animate-fade-in-up">
              <button
                onClick={() => onNavigate('home', { openQuizSetup: true })}
                className="
                                group relative inline-flex items-center justify-center
                                w-full max-w-xs sp:max-w-sm md:max-w-md
                                h-16 sp:h-18 md:h-20
                                px-6 sp:px-8 py-4 
                                text-base sp:text-lg md:text-xl font-semibold text-white
                                bg-gradient-to-r from-amber-600 to-orange-600
                                rounded-2xl md:rounded-3xl
                                shadow-xl shadow-amber-600/25 
                                hover:shadow-amber-600/40 hover:scale-[1.02] active:scale-[0.98]
                                transform transition-all duration-200
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2
                                touch-manipulation
                            "
                aria-label="Start a new quiz"
              >
                <svg
                  className="w-5 h-5 sp:w-6 sp:h-6 mr-2 sp:mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Start New Quiz
              </button>
            </div>

            {/* Subtle Recommendation */}
            <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <button
                onClick={() => setShowStorySetup(true)}
                className="text-amber-600 hover:text-amber-700 font-medium transition-colors duration-300 inline-flex items-center group"
              >
                <span>Learn using Stories</span>
                <svg
                  className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Recommended Topics */}
          <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex flex-wrap justify-center gap-3">
              {recommendedTopics.length > 0 ? (
                recommendedTopics.map((topic, index) => (
                  <button
                    key={topic}
                    onClick={() => {
                      // Open quiz setup modal with the recommended topic pre-filled
                      onNavigate('home', { openQuizSetup: true, recommendedTopic: topic });
                    }}
                    className="group px-4 py-2 rounded-lg hover:border-amber-200 transition-all duration-300 hover:shadow-md animate-fade-in-up"
                    style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                    aria-label={`Start quiz about ${topic}`}
                  >
                    <span
                      className="text-sm font-medium hover:text-amber-800 transition-colors inline-flex items-center gap-1"
                      style={{ color: '#808080ba' }}
                    >
                      {topic}
                      <svg
                        className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </span>
                  </button>
                ))
              ) : (
                // Display message if no recommended topics are available
                <p className="text-slate-500 text-sm italic">
                  Complete a quiz to get personalized topic recommendations!
                </p>
              )}
            </div>
          </div>

          {/* Content Display Section */}
          {/* <div className="mt-8 min-h-[200px] animate-fade-in">
                        {displayContent === 'continue' && (
                            <div className="space-y-4">
                                {pausedQuizzes.length > 0 ? (
                                    pausedQuizzes.slice(0, 3).map((quiz, index) => (
                                        <div key={quiz.id} style={{ animationDelay: `${index * 0.1}s` }}>
                                            <PausedQuizCard quiz={quiz} onContinue={handleContinueQuiz} />
                                        </div>
                                    ))
                                ) : (
                                    <EmptyState
                                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                                        title="No paused quizzes"
                                        message="Start a new quiz to begin learning"
                                    />
                                )}
                            </div>
                        )}

                        {displayContent === 'bookmarks' && (
                            <div className="space-y-4">
                                {bookmarks.length > 0 ? (
                                    bookmarks.slice(0, 3).map((bookmark, index) => (
                                        <div key={bookmark.id} style={{ animationDelay: `${index * 0.1}s` }}>
                                            <BookmarkCard bookmark={bookmark} onOpen={handleOpenBookmark} />
                                        </div>
                                    ))
                                ) : (
                                    <EmptyState
                                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />}
                                        title="No bookmarks yet"
                                        message="Save interesting quizzes to review later"
                                    />
                                )}
                            </div>
                        )}

                        {displayContent === 'stories' && (
                            <EmptyState
                                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />}
                                title="Stories coming soon"
                                message="Learn through interactive stories and scenarios"
                            />
                        )}
                    </div> */}
        </main>

        {/* Quiz Setup Modal */}
        <QuizSetupModal
          isOpen={showQuizSetup} // Don't show if progress tracker is active
          onClose={() => setShowQuizSetup(false)}
          onStartQuiz={handleStartQuiz}
          selectionText={navigationData?.selectionText}
          recommendedTopic={navigationData?.recommendedTopic}
        />

        <StorySetupModal
          isOpen={showStorySetup}
          onClose={() => setShowStorySetup(false)}
          onStartStory={handleStartStory}
          selectionText={navigationData?.selectionText}
        />

        {/* Progress Tracker - Shown during processing */}
      </div>

      {/* Extracted CSS */}
      <style>{`
                 @keyframes scroll-horizontal {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }

                .animate-scroll-horizontal {
                    animation: scroll-horizontal 30s linear infinite;
                    display: flex;
                    will-change: transform;
                }

                .animate-scroll-horizontal:hover {
                    animation-play-state: paused;
                }
                @keyframes fadeIn {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                
                @keyframes fadeInUp {
                    0% { 
                        opacity: 0; 
                        transform: translateY(20px); 
                    }
                    100% { 
                        opacity: 1; 
                        transform: translateY(0); 
                    }
                }

                @keyframes pulse-slow {
                    0%, 100% { 
                        opacity: 0.3; 
                        transform: scale(1); 
                    }
                    50% { 
                        opacity: 0.5; 
                        transform: scale(1.05); 
                    }
                }
                
                .animate-fade-in {
                    animation: fadeIn 0.8s ease-out;
                }
                
                .animate-fade-in-up {
                    animation: fadeInUp 0.8s ease-out both;
                }

                .animate-pulse-slow {
                    animation: pulse-slow 4s ease-in-out infinite;
                }
                
                .animation-delay-2000 {
                    animation-delay: 2s;
                }

                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
    </>
  );
};

export default HomePage;
