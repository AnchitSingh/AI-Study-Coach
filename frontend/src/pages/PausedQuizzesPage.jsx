import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import GlobalHeader from '../components/ui/GlobalHeader';
import aiStudyCoachAPI from '../services/api';
import BackgroundEffects from '../components/ui/BackgroundEffects';

// Delete Confirmation Modal
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, quizTitle }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-modal-enter">
          <div className="p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h3 className="text-lg font-semibold text-slate-800 text-center mb-2">Restart Quiz?</h3>
            <p className="text-slate-600 text-center mb-6">
              Are you sure you want to restart "{quizTitle}"? Your current progress will be lost.
            </p>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Restart Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Quiz Card Component
const QuizCard = ({ quiz, onResume, onRestart, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);

  const formatTimeAgo = (date) => {
    const now = Date.now();
    const then = new Date(date).getTime();
    const seconds = Math.floor((now - then) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return 'No limit';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 75) return 'from-green-500 to-emerald-500';
    if (progress >= 50) return 'from-amber-500 to-orange-500';
    if (progress >= 25) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-rose-500';
  };

  const getScoreColor = (correct, total) => {
    const percentage = (correct / total) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  // Function to get top 3 topic tags from questions
  const getTopTopicTags = () => {
    const tagCount = {};

    if (quiz.questions && Array.isArray(quiz.questions)) {
      quiz.questions.forEach((question) => {
        if (question.tags && Array.isArray(question.tags)) {
          question.tags.forEach((tag) => {
            const cleanTag = tag.trim();
            if (cleanTag) {
              tagCount[cleanTag] = (tagCount[cleanTag] || 0) + 1;
            }
          });
        }
      });
    }

    // Sort tags by frequency and return top 3
    return Object.entries(tagCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([tag]) => tag);
  };

  const topTags = getTopTopicTags();

  return (
    <div
      className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Header with Gradient Background */}
      <div className={`h-1.5 bg-gradient-to-r ${getProgressColor(quiz.progress)}`} />

      <div className="p-4">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              {topTags.length > 0 ? (
                // Show top 3 tags as badges
                topTags.map((tag, index) => (
                  <Badge key={index} variant="default" size="sm">
                    {tag}
                  </Badge>
                ))
              ) : (
                // Fallback to subject badge if no tags
                <Badge
                  variant={
                    quiz.subject === 'Physics'
                      ? 'info'
                      : quiz.subject === 'Math'
                        ? 'success'
                        : 'purple'
                  }
                  size="sm"
                >
                  {quiz.subject}
                </Badge>
              )}
              <Badge
                variant={
                  quiz.difficulty === 'Easy'
                    ? 'success'
                    : quiz.difficulty === 'Medium'
                      ? 'warning'
                      : 'danger'
                }
                size="xs"
              >
                {quiz.difficulty}
              </Badge>
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1 line-clamp-1 group-hover:text-amber-600 transition-colors">
              {quiz.title}
            </h3>
            <p className="text-xs text-slate-500">Paused {formatTimeAgo(quiz.pausedAt)}</p>
          </div>

          {/* Delete button */}
          <button
            onClick={() => onDelete(quiz)}
            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-lg transition-all duration-200 ml-2"
            title="Delete quiz"
          >
            <svg
              className="w-4 h-4 text-slate-400 hover:text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>

        {/* Progress Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-700">Progress</span>
            <span className="text-xs text-slate-600">
              {quiz.currentQuestion}/{quiz.totalQuestions}
            </span>
          </div>

          {/* Custom Progress Bar */}
          <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getProgressColor(quiz.progress)} transition-all duration-500 ease-out`}
              style={{ width: `${quiz.progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs font-semibold text-slate-600">{quiz.progress}%</span>
            <span className="text-xs text-slate-500">
              {quiz.totalQuestions - quiz.currentQuestion} left
            </span>
          </div>
        </div>

        {/* Stats Grid - Compact */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-slate-50 rounded-lg p-2">
            <div className="flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 text-amber-600"
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
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-500 leading-none">Score</p>
                <p
                  className={`text-xs font-semibold ${getScoreColor(quiz.score.correct, quiz.score.total)}`}
                >
                  {quiz.score.correct}/{quiz.score.total}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-2">
            <div className="flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 text-blue-600"
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
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-500 leading-none">Time</p>
                <p className="text-xs font-semibold text-slate-700">
                  {formatDuration(quiz.timeRemaining)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Compact */}
        <div className="space-y-1.5">
          <Button onClick={() => onResume(quiz.id)} className="w-full py-2 text-sm group" size="sm">
            <span className="flex items-center justify-center">
              Continue
              <svg
                className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </span>
          </Button>

          <button
            onClick={() => onRestart(quiz)}
            className="w-full px-3 py-1.5 text-xs text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg font-medium transition-all duration-200"
          >
            Restart from Beginning
          </button>
        </div>
      </div>

      {/* Hover Effect Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-amber-50/5 to-transparent pointer-events-none transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};

// Main Component
const PausedQuizzesPage = ({ onNavigate }) => {
  const [pausedQuizzes, setPausedQuizzes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('All');
  const [sortBy, setSortBy] = useState('recent');
  const [isLoading, setIsLoading] = useState(true);
  const [restartModal, setRestartModal] = useState({ isOpen: false, quiz: null });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const loadPausedQuizzes = async () => {
      setIsLoading(true);
      try {
        const response = await aiStudyCoachAPI.getPausedQuizzes();
        if (response.success) {
          setPausedQuizzes(response.data);
        }
      } catch (error) {
        console.error('Error loading paused quizzes:', error);
        toast.error('Failed to load paused quizzes');
      } finally {
        setIsLoading(false);
      }
    };
    loadPausedQuizzes();
  }, []);

  // Get unique subjects for filter
  const subjects = useMemo(() => {
    const uniqueSubjects = [...new Set(pausedQuizzes.map((q) => q.subject))];
    return ['All', ...uniqueSubjects];
  }, [pausedQuizzes]);

  // Filter and sort quizzes
  const filteredQuizzes = useMemo(() => {
    let filtered = pausedQuizzes;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (quiz) =>
          quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          quiz.subject.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply subject filter
    if (filterSubject !== 'All') {
      filtered = filtered.filter((quiz) => quiz.subject === filterSubject);
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.pausedAt) - new Date(a.pausedAt);
        case 'progress':
          return b.progress - a.progress;
        case 'score':
          return b.score.correct / b.score.total - a.score.correct / a.score.total;
        default:
          return 0;
      }
    });

    return filtered;
  }, [pausedQuizzes, searchQuery, filterSubject, sortBy]);

  const resumeQuiz = (quizId) => {
    toast.success('Resuming quiz...');
    onNavigate('quiz', { quizConfig: { quizId: quizId } });
  };

  const handleRestartClick = (quiz) => {
    setRestartModal({ isOpen: true, quiz });
  };

  const confirmRestart = () => {
    if (restartModal.quiz) {
      toast.success('Restarting quiz...');
      onNavigate('quiz', { quizConfig: restartModal.quiz.config });
      setRestartModal({ isOpen: false, quiz: null });
    }
  };

  const deleteQuiz = async (quiz) => {
    try {
      const response = await aiStudyCoachAPI.removePausedQuiz(quiz.id);
      if (response.success) {
        setPausedQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
        toast.success('Quiz deleted successfully');
      } else {
        toast.error('Failed to delete quiz: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      toast.error('Failed to delete quiz: ' + error.message);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterSubject('All');
    setSortBy('recent');
  };

  const hasActiveFilters = searchQuery || filterSubject !== 'All' || sortBy !== 'recent';

  return (
    <div className="antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 min-h-screen">
      <BackgroundEffects />
      <GlobalHeader currentPage="paused" onNavigate={onNavigate} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-8 relative z-10">
        {/* Page Header with Filter Toggle */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Continue Learning</h2>
              <p className="text-slate-600">Pick up where you left off with your paused quizzes</p>
            </div>

            {/* Filter Toggle Button */}
            {pausedQuizzes.length > 0 && (
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    Clear filters
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2 bg-white border rounded-lg transition-all duration-200 flex items-center gap-2 ${
                    showFilters
                      ? 'border-amber-500 shadow-md'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <svg
                    className="w-5 h-5 text-slate-600"
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
                  <span className="font-medium text-sm">
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </span>
                  {hasActiveFilters && <span className="w-2 h-2 bg-amber-500 rounded-full"></span>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progressive Filters - Show when toggled */}
        {showFilters && pausedQuizzes.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-4 mb-6 animate-slide-down">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search quizzes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
                <svg
                  className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Filter by Subject */}
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              >
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject === 'All' ? 'All Subjects' : subject}
                  </option>
                ))}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              >
                <option value="recent">Most Recent</option>
                <option value="progress">Most Progress</option>
                <option value="score">Best Score</option>
              </select>
            </div>

            {/* Results Count */}
            {(searchQuery || filterSubject !== 'All') && (
              <div className="mt-3 text-xs text-slate-600">
                Showing {filteredQuizzes.length} of {pausedQuizzes.length} quizzes
              </div>
            )}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading your paused quizzes...</p>
            </div>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="text-center py-24 animate-fade-in">
            <div className="w-32 h-32 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-16 h-16 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              {searchQuery || filterSubject !== 'All'
                ? 'No matching quizzes found'
                : 'No Paused Quizzes'}
            </h3>
            <p className="text-slate-600 mb-6">
              {searchQuery || filterSubject !== 'All'
                ? 'Try adjusting your search or filters'
                : "You don't have any paused quizzes at the moment"}
            </p>
            {!searchQuery && filterSubject === 'All' && (
              <Button onClick={() => onNavigate('home', { openQuizSetup: true })}>
                Start New Quiz
              </Button>
            )}
          </div>
        ) : (
          /* Quiz Cards Grid - 4 columns on desktop */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredQuizzes.map((quiz, index) => (
              <div
                key={quiz.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
              >
                <QuizCard
                  quiz={quiz}
                  onResume={resumeQuiz}
                  onRestart={handleRestartClick}
                  onDelete={deleteQuiz}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Restart Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={restartModal.isOpen}
        onClose={() => setRestartModal({ isOpen: false, quiz: null })}
        onConfirm={confirmRestart}
        quizTitle={restartModal.quiz?.title}
      />

      {/* Custom Styles */}
      <style>{`
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

        @keyframes slideDown {
          0% { 
            opacity: 0; 
            transform: translateY(-10px); 
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

        @keyframes modal-enter {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out;
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out both;
        }

        .animate-slide-down {
          animation: slideDown 0.3s ease-out;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animate-modal-enter {
          animation: modal-enter 0.2s ease-out;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default PausedQuizzesPage;
