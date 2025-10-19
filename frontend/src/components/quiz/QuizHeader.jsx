/**
 * @fileoverview Header component for quiz pages with responsive controls.
 * 
 * This component provides the header for quiz pages with controls for bookmarking,
 * pausing, stopping, and displaying the timer and question progress. It supports
 * responsive layouts for mobile, tablet, and desktop views, with different UI
 * patterns optimized for each screen size.
 * 
 * @module QuizHeader
 */

import React, { useState, useEffect, useRef } from 'react';
import Button from '../ui/Button';

/**
 * Expanding button component for quiz controls.
 * 
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.icon - Icon element to display
 * @param {string} props.label - Text label to display when expanded
 * @param {Function} props.onClick - Click handler function
 * @param {'secondary'|'danger'|'bookmark'} [props.variant='secondary'] - Button variant
 * @param {boolean} [props.isBookmarked=false] - Whether the item is bookmarked (for bookmark variant)
 * 
 * @returns {JSX.Element} The expanding button component
 */
const ExpandingQuizButton = ({
  icon,
  label,
  onClick,
  variant = 'secondary',
  isBookmarked = false,
}) => {
  /**
   * Whether the button is currently expanded
   * @type {boolean}
   */
  const [isHovered, setIsHovered] = useState(false);
  
  /**
   * Whether the device supports touch input
   * @type {boolean}
   */
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  /**
   * Timeout reference for delayed hover state changes
   * @type {React.MutableRefObject<number|null>}
   */
  const leaveTimeoutRef = useRef(null);

  /**
   * Detect touch device capability
   */
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  /**
   * Cleanup timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handle mouse enter event to expand the button
   */
  const handleMouseEnter = () => {
    if (!isTouchDevice) {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = null;
      }
      setIsHovered(true);
    }
  };

  /**
   * Handle mouse leave event to collapse the button after delay
   */
  const handleMouseLeave = () => {
    if (!isTouchDevice) {
      leaveTimeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 150);
    }
  };

  /**
   * Handle touch start event to toggle expansion
   * @param {TouchEvent} e - Touch event
   */
  const handleTouchStart = (e) => {
    e.preventDefault();
    setIsHovered(!isHovered);
  };

  /**
   * Handle click event to execute action and manage mobile expansion
   */
  const handleClick = () => {
    onClick();
    if (isTouchDevice) {
      setTimeout(() => setIsHovered(false), 1000);
    }
  };

  /**
   * Get CSS classes for different button variants
   * @returns {string} CSS classes for the button
   */
  const getVariantStyles = () => {
    if (variant === 'bookmark') {
      return isBookmarked
        ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
        : 'bg-white text-slate-600 hover:bg-amber-50 hover:text-amber-600';
    }
    if (variant === 'danger') {
      return 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200';
    }
    return 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200';
  };

  return (
    <button
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      aria-label={label}
      className={`
        relative flex items-center justify-start
        h-9 rounded-full overflow-hidden
        transition-all duration-300 ease-out
        shadow-sm
        ${isHovered ? 'pl-2 pr-3' : 'px-0'}
        ${getVariantStyles()}
      `}
      style={{
        width: isHovered ? 'auto' : '36px',
        minWidth: isHovered ? '100px' : '36px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Icon container */}
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: isHovered ? '28px' : '36px',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {icon}
      </div>

      {/* Text */}
      <span
        className="text-sm font-medium whitespace-nowrap"
        style={{
          opacity: isHovered ? 1 : 0,
          maxWidth: isHovered ? '150px' : '0',
          marginLeft: isHovered ? '0.5rem' : '0',
          transition: 'opacity 0.3s ease-out, max-width 0.3s ease-out, margin-left 0.3s ease-out',
        }}
      >
        {label}
      </span>
    </button>
  );
};

/**
 * Header component for quiz pages with responsive controls.
 * 
 * @param {Object} props - Component properties
 * @param {string} [props.title='Quiz'] - Title to display in the header
 * @param {number} props.currentQuestion - Current question number
 * @param {number} props.totalQuestions - Total number of questions
 * @param {number} props.timeLeft - Time remaining in seconds
 * @param {Function} props.onPause - Callback for pause button
 * @param {Function} props.onStop - Callback for stop button
 * @param {Function} props.onBookmark - Callback for bookmark button
 * @param {boolean} [props.isBookmarked=false] - Whether the current question is bookmarked
 * 
 * @returns {JSX.Element} The rendered quiz header component
 * 
 * @example
 * <QuizHeader
 *   title="Biology Quiz"
 *   currentQuestion={5}
 *   totalQuestions={10}
 *   timeLeft={300}
 *   onPause={handlePause}
 *   onStop={handleStop}
 *   onBookmark={handleBookmark}
 *   isBookmarked={false}
 * />
 */
const QuizHeader = ({
  title = 'Quiz',
  currentQuestion,
  totalQuestions,
  timeLeft,
  onPause,
  onStop,
  onBookmark,
  isBookmarked = false,
}) => {
  /**
   * Format seconds to MM:SS format
   * @param {number} seconds - Time in seconds to format
   * @returns {string} Formatted time string in MM:SS format
   */
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Whether the time is running low (less than 30 seconds)
   * @type {boolean}
   */
  const isTimeWarning = timeLeft <= 30;

  // Icons
  const BookmarkIcon = ({ filled = false }) => (
    <svg
      className="w-5 h-5"
      fill={filled ? 'currentColor' : 'none'}
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
  );

  const PauseIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );

  const StopIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 6h12v12H6z" />
    </svg>
  );

  const TimerIcon = () => (
    <svg
      className={`w-5 h-5 ${isTimeWarning ? 'text-red-600' : 'text-amber-600'}`}
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
  );

  return (
    <header className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        {/* Mobile Layout */}
        <div className="sm:hidden">
          {/* Top Row: Logo and Timer */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">EB</span>
              </div>
              <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
            </div>

            {/* Timer (Mobile) */}
            <div
              className={`flex items-center space-x-1.5 rounded-full px-3 py-1.5 shadow-sm border ${
                isTimeWarning
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-white/90 border-amber-100 text-slate-700'
              }`}
            >
              <TimerIcon />
              <span
                className={`font-mono text-base font-semibold ${isTimeWarning ? 'animate-pulse' : ''}`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Bottom Row: Controls and Progress */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Bookmark (Mobile) */}
              <button
                onClick={onBookmark}
                className={`p-1.5 rounded-lg transition-all duration-200 shadow-sm ${
                  isBookmarked
                    ? 'text-amber-600 bg-amber-50 border border-amber-200'
                    : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50 bg-white border border-slate-200'
                }`}
                aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this question'}
              >
                <BookmarkIcon filled={isBookmarked} />
              </button>

              <Button onClick={onPause} variant="secondary" size="sm">
                <PauseIcon />
                <span className="ml-1">Pause</span>
              </Button>

              <Button onClick={onStop} variant="danger" size="sm">
                <StopIcon />
                <span className="ml-1">Stop</span>
              </Button>
            </div>

            {/* Question Counter (Mobile) */}
            <div className="text-sm text-slate-600 bg-slate-100 rounded-full px-2.5 py-1 shadow-sm">
              <span className="font-semibold text-slate-800">{currentQuestion}</span> of{' '}
              <span className="font-semibold text-slate-800">{totalQuestions}</span>
            </div>
          </div>
        </div>

        {/* Tablet Layout (md to lg) - Expanding Pills */}
        <div className="hidden sm:flex lg:hidden items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">EB</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
          </div>

          {/* Controls & Timer */}
          <div className="flex items-center space-x-3">
            {/* Expanding Control Buttons */}
            <div className="flex items-center space-x-2">
              <ExpandingQuizButton
                icon={<BookmarkIcon filled={isBookmarked} />}
                label={isBookmarked ? 'Bookmarked' : 'Bookmark'}
                onClick={onBookmark}
                variant="bookmark"
                isBookmarked={isBookmarked}
              />

              <ExpandingQuizButton
                icon={<PauseIcon />}
                label="Pause"
                onClick={onPause}
                variant="secondary"
              />

              <ExpandingQuizButton
                icon={<StopIcon />}
                label="Stop"
                onClick={onStop}
                variant="danger"
              />
            </div>

            {/* Timer (Tablet) */}
            <div
              className={`flex items-center space-x-2 rounded-full px-4 py-2 shadow-lg border ${
                isTimeWarning ? 'bg-red-50 border-red-200' : 'bg-white/90 border-amber-100'
              }`}
            >
              <TimerIcon />
              <span
                className={`font-mono text-base font-semibold ${
                  isTimeWarning ? 'text-red-700 animate-pulse' : 'text-slate-700'
                }`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Question Counter */}
            <div className="text-sm text-slate-600 bg-slate-100 rounded-full px-3 py-1.5 shadow-sm">
              <span className="font-semibold text-slate-800">{currentQuestion}</span> of{' '}
              <span className="font-semibold text-slate-800">{totalQuestions}</span>
            </div>
          </div>
        </div>

        {/* Desktop Layout (lg and up) - Full Buttons */}
        <div className="hidden lg:flex items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">EB</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
          </div>

          {/* Controls & Timer */}
          <div className="flex items-center space-x-4">
            {/* Control Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={onBookmark}
                className={`p-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 shadow-sm border ${
                  isBookmarked
                    ? 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100'
                    : 'text-slate-600 bg-white border-slate-200 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200'
                }`}
                aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this question'}
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark this question'}
              >
                <BookmarkIcon filled={isBookmarked} />
              </button>

              <Button onClick={onPause} variant="secondary" size="md">
                <PauseIcon />
                <span className="ml-2">Pause</span>
              </Button>

              <Button onClick={onStop} variant="danger" size="md">
                <StopIcon />
                <span className="ml-2">Stop</span>
              </Button>
            </div>

            {/* Timer (Desktop) */}
            <div
              className={`flex items-center space-x-2 rounded-full px-4 py-2 shadow-lg border ${
                isTimeWarning ? 'bg-red-50 border-red-200' : 'bg-white/90 border-amber-100'
              }`}
            >
              <TimerIcon />
              <span
                className={`font-mono text-lg font-semibold ${
                  isTimeWarning ? 'text-red-700 animate-pulse' : 'text-slate-700'
                }`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Question Counter */}
            <div className="text-sm text-slate-600 bg-slate-100 rounded-full px-3 py-1.5 shadow-sm">
              <span className="font-semibold text-slate-800">{currentQuestion}</span> of{' '}
              <span className="font-semibold text-slate-800">{totalQuestions}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default QuizHeader;
