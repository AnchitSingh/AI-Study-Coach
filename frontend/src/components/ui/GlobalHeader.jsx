/**
 * @fileoverview Global application header component with navigation and user profile.
 * 
 * This component provides the main header for the application with responsive navigation
 * that works across different screen sizes. It includes profile management, mobile menu
 * support, and consistent icon management across the application.
 * 
 * The header features expanding navigation items on medium screens, a profile modal,
 * and accessibility features like keyboard navigation and ARIA labels.
 * 
 * @module GlobalHeader
 */

import React, { useState, useEffect, useRef } from 'react';
import { useProfile } from '../../contexts/ProfileContext';

/**
 * Returns SVG icons based on the specified icon name.
 * 
 * @param {'home'|'bookmark'|'pause'|'stats'|'plus'|'menu'|'user'} iconName - The name of the icon to render
 * @param {boolean} [isActive=false] - Whether the icon is in an active state (affects color)
 * @returns {JSX.Element|null} The SVG icon component or null if icon name is not found
 * 
 * @example
 * const homeIcon = getIcon('home', true);  // Active home icon
 * const bookmarkIcon = getIcon('bookmark'); // Default inactive bookmark icon
 */
const getIcon = (iconName, isActive = false) => {
  const className = `w-5 h-5 transition-colors ${isActive ? 'text-amber-600' : 'text-slate-800'}`;
  const userIconClassName = `w-5 h-5 text-gray-600`;
  const mobileMenuClassName = `w-6 h-6 text-gray-600`;

  switch (iconName) {
    case 'home':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          className={className}
        >
          <path
            d="M2 10L11.1076 2.80982C11.3617 2.60915 11.6761 2.5 12 2.5C12.3239 2.5 12.6383 2.60915 12.8924 2.80982L16.5 5.65789V4C16.5 3.44772 16.9477 3 17.5 3H18.5C19.0523 3 19.5 3.44771 19.5 4V8.02632L22 10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 11.5V15.5C20 18.3284 20 19.7426 19.1213 20.6213C18.2426 21.5 16.8284 21.5 14 21.5H10C7.17157 21.5 5.75736 21.5 4.87868 20.6213C4 19.7426 4 18.3284 4 15.5V11.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15.0011 15.5C14.2016 16.1224 13.1513 16.5 12.0011 16.5C10.8509 16.5 9.80062 16.1224 9.0011 15.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'bookmark':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          className={className}
        >
          <path
            d="M20 22H6C4.89543 22 4 21.1046 4 20M4 20C4 18.8954 4.89543 18 6 18H18C19.1046 18 20 17.1046 20 16V2C20 3.10457 19.1046 4 18 4L10 4C7.17157 4 5.75736 4 4.87868 4.87868C4 5.75736 4 7.17157 4 10V20Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 4V12L12 9L15 12V4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18.5 18C18.5 18 17.5 18.7628 17.5 20C17.5 21.2372 18.5 22 18.5 22"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'pause':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          className={className}
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M9.5 9L9.5 15M14.5 9V15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'stats':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          className={className}
        >
          <path
            d="M6.5 17.5L6.5 14.5M11.5 17.5L11.5 8.5M16.5 17.5V13.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M21.5 5.5C21.5 7.15685 20.1569 8.5 18.5 8.5C16.8431 8.5 15.5 7.15685 15.5 5.5C15.5 3.84315 16.8431 2.5 18.5 2.5C20.1569 2.5 21.5 3.84315 21.5 5.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M21.4955 11C21.4955 11 21.5 11.3395 21.5 12C21.5 16.4784 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4784 2.5 12C2.5 7.52169 2.5 5.28252 3.89124 3.89127C5.28249 2.50003 7.52166 2.50003 12 2.50003L13 2.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'plus':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          className={className}
        >
          <path
            d="M12 2.00012C17.5228 2.00012 22 6.47727 22 12.0001C22 17.523 17.5228 22.0001 12 22.0001C6.47715 22.0001 2 17.523 2 12.0001M8.909 2.48699C7.9 2.8146 6.96135 3.29828 6.12153 3.90953M3.90943 6.12162C3.29806 6.9616 2.81432 7.90044 2.4867 8.90964"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 8.00012V16.0001M16 12.0001L8 12.0001"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'menu':
      return (
        <svg className={mobileMenuClassName} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 6h16M4 12h16m-7 6h7"
          />
        </svg>
      );
    case 'user':
      return (
        <svg className={userIconClassName} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      );
    default:
      return null;
  }
};

/**
 * Expanding navigation item component that animates between icon-only and full text.
 * 
 * This component provides a responsive navigation item that expands to show text
 * on hover for medium screens. It handles both mouse and touch interactions.
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.item - Navigation item configuration: { id, label, icon, action }
 * @param {boolean} props.isActive - Whether this item is currently active
 * @param {Function} props.onClick - Click handler for the navigation item
 * 
 * @returns {JSX.Element} The rendered navigation item
 */
const ExpandingNavItem = ({ item, isActive, onClick }) => {
  /**
   * Whether the item is currently expanded/hovered
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
   * Detect touch device capability on mount
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
   * Handle mouse enter event to expand the item
   */
  const handleMouseEnter = () => {
    if (!isTouchDevice) {
      // Clear any pending leave timeout to prevent flickering
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = null;
      }
      setIsHovered(true);
    }
  };

  /**
   * Handle mouse leave event to collapse the item after delay
   */
  const handleMouseLeave = () => {
    if (!isTouchDevice) {
      // Add a delay before collapsing to handle edge cases
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
   * Handle click event to navigate and manage mobile expansion
   */
  const handleClick = () => {
    onClick();
    if (isTouchDevice) {
      // For mobile, keep expanded briefly after click
      setTimeout(() => setIsHovered(false), 1000);
    }
  };

  return (
    <button
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      aria-label={item.label}
      className={`
                relative flex items-center justify-start
                h-10 rounded-full overflow-hidden
                transition-all duration-300 ease-out
                ${isHovered ? 'pl-2 pr-4' : 'px-0'}
                ${
                  isActive
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }
            `}
      style={{
        width: isHovered ? 'auto' : '40px',
        minWidth: isHovered ? '120px' : '40px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Icon container - smaller when expanded for better balance */}
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: isHovered ? '32px' : '40px',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {getIcon(item.icon, isActive)}
      </div>

      {/* Text with better spacing */}
      <span
        className="text-sm font-medium whitespace-nowrap"
        style={{
          opacity: isHovered ? 1 : 0,
          maxWidth: isHovered ? '200px' : '0',
          marginLeft: isHovered ? '0.625rem' : '0',
          transition: 'opacity 0.3s ease-out, max-width 0.3s ease-out, margin-left 0.3s ease-out',
        }}
      >
        {item.label}
      </span>
    </button>
  );
};

/**
 * Tooltip component for displaying additional information on hover.
 * 
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Element to wrap with tooltip
 * @param {string} props.content - Tooltip content text
 * 
 * @returns {JSX.Element} The element with tooltip functionality
 */
const Tooltip = ({ children, content }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <div
        className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md shadow-lg transition-opacity duration-200 z-50 whitespace-nowrap ${
          isVisible ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        {content}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-800"></div>
      </div>
    </div>
  );
};

/**
 * Global header component with navigation and user profile management.
 * 
 * @param {Object} props - Component properties
 * @param {string} [props.currentPage='home'] - Current active page identifier
 * @param {Function} props.onNavigate - Navigation callback function
 * @param {Function} [props.onProfileUpdate] - Callback for profile updates
 * 
 * @returns {JSX.Element} The rendered header component
 * 
 * @example
 * <GlobalHeader 
 *   currentPage="home" 
 *   onNavigate={(page) => setCurrentPage(page)} 
 *   onProfileUpdate={(name) => console.log('Updated name:', name)} 
 * />
 */
const GlobalHeader = ({ currentPage = 'home', onNavigate, onProfileUpdate }) => {
  /**
   * Whether the mobile menu is currently visible
   * @type {boolean}
   */
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  /**
   * Whether the profile modal is currently visible
   * @type {boolean}
   */
  const [showProfileModal, setShowProfileModal] = useState(false);

  /**
   * User profile context containing user data and update functions
   * @type {Object}
   */
  const { profile, updateProfileName, loading } = useProfile();
  
  /**
   * Local copy of profile name for editing
   * @type {string}
   */
  const [localProfileName, setLocalProfileName] = useState(profile?.name || 'Study Enthusiast');

  /**
   * Update local state when profile changes
   */
  useEffect(() => {
    if (profile?.name) {
      setLocalProfileName(profile.name);
    }
  }, [profile]);

  /**
   * Navigation items configuration with ID, label, icon, and action
   * @type {Array<Object>}
   */
  const navigationItems = [
    { id: 'home', label: 'Home', icon: 'home', action: () => onNavigate('home') },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      icon: 'bookmark',
      action: () => onNavigate('bookmarks'),
    },
    { id: 'paused', label: 'Paused', icon: 'pause', action: () => onNavigate('paused') },
    { id: 'stats', label: 'Stats', icon: 'stats', action: () => onNavigate('stats') },
    {
      id: 'quiz',
      label: 'New Quiz',
      icon: 'plus',
      action: () => onNavigate('home', { openQuizSetup: true }),
    },
  ];

  /**
   * Handle form submission for profile name update
   * @param {React.FormEvent} e - Form submission event
   */
  const handleProfileNameSubmit = async (e) => {
    e.preventDefault();
    await updateProfileName(localProfileName);
    if (onProfileUpdate && typeof onProfileUpdate === 'function') {
      onProfileUpdate(localProfileName);
    }
    setShowProfileModal(false);
  };

  /**
   * Close mobile menu when escape key is pressed
   */
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showMobileMenu) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showMobileMenu]);

  /**
   * Prevent body scroll when mobile menu is open
   */
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileMenu]);

  return (
    <>
      <header className="fixed h-[4rem] top-4 left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-max">
        {/* The main floating "island" container */}
        <div className="bg-white/80 backdrop-blur-lg h-full rounded-[1.25rem] shadow-lg flex items-center justify-between p-2">
          {/* Logo - always visible with "Coach" text only on medium screens and larger */}
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('home');
            }}
            className="flex items-center space-x-2.5 pl-3 flex-shrink-0"
            aria-label="Education Coach - Home"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">SC</span>
              </div>
            </div>
            <span className="font-bold text-xl text-gray-800 hidden sm:block mr-2">Coach</span>
          </a>

          {/* Right-side container for nav and actions */}
          <div className="flex items-center">
            {/* Large Screen Navigation (lg and up) - Icons and Text */}
            <nav
              className="hidden lg:flex items-center space-x-1 border-l border-gray-200 ml-2 pl-2"
              aria-label="Main navigation"
            >
              {navigationItems.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-amber-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {getIcon(item.icon, isActive)}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Medium Screen Navigation (md to lg) - Expanding Pills */}
            <nav
              className="hidden md:flex lg:hidden items-center space-x-1 border-l border-gray-200 ml-2 pl-2"
              aria-label="Main navigation"
            >
              {navigationItems.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <ExpandingNavItem
                    key={item.id}
                    item={item}
                    isActive={isActive}
                    onClick={item.action}
                  />
                );
              })}

              {/* Profile Icon for Medium screens */}
              <button
                className="relative flex items-center justify-center h-10 w-10 rounded-full transition-all duration-200 text-slate-600 hover:bg-slate-100"
                aria-label={localProfileName ? `Profile: ${localProfileName}` : 'Profile'}
                onClick={() => setShowProfileModal(true)}
              >
                {localProfileName ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-semibold text-gray-700 uppercase shadow-sm">
                    {localProfileName.charAt(0)}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    {getIcon('user')}
                  </div>
                )}
              </button>
            </nav>

            {/* User Profile Icon (lg and up) */}
            <div className="hidden lg:flex items-center pl-3 pr-1">
              <button
                className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center hover:from-gray-200 hover:to-gray-300 transition-all shadow-sm"
                aria-label={localProfileName ? `Profile: ${localProfileName}` : 'Profile'}
                onClick={() => setShowProfileModal(true)}
              >
                {localProfileName ? (
                  <span className="font-semibold text-gray-700 uppercase text-sm">
                    {localProfileName.charAt(0)}
                  </span>
                ) : (
                  getIcon('user')
                )}
              </button>
            </div>

            {/* Mobile View Navigation - Expanding Pills */}
            <div className="md:hidden flex items-center space-x-1 border-l border-gray-200 pl-2">
              {navigationItems.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <ExpandingNavItem
                    key={item.id}
                    item={item}
                    isActive={isActive}
                    onClick={item.action}
                  />
                );
              })}

              {/* Profile Icon for Mobile */}
              <button
                className="relative flex items-center justify-center h-10 w-10 rounded-full transition-all duration-200 text-slate-600 hover:bg-slate-100"
                aria-label={localProfileName ? `Profile: ${localProfileName}` : 'Profile'}
                onClick={() => setShowProfileModal(true)}
              >
                {localProfileName ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-semibold text-gray-700 uppercase shadow-sm">
                    {localProfileName.charAt(0)}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    {getIcon('user')}
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay & Dropdown (kept for future use if needed) */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 z-30 bg-black/10 backdrop-blur-sm"
          onClick={() => setShowMobileMenu(false)}
          aria-hidden="true"
        >
          <div
            className="fixed top-24 left-4 right-4 z-40 bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/80 p-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Mobile navigation menu"
          >
            <nav className="flex flex-col space-y-2">
              {navigationItems.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.action();
                      setShowMobileMenu(false);
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-left text-base font-medium transition-colors ${
                      isActive ? 'bg-amber-50 text-amber-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {getIcon(item.icon, isActive)}
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="border-t border-gray-200 pt-4 mt-2">
                <button
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left text-base font-medium text-gray-600 hover:bg-gray-50"
                  onClick={() => {
                    setShowProfileModal(true);
                    setShowMobileMenu(false);
                  }}
                  aria-label={localProfileName ? `Profile: ${localProfileName}` : 'Profile'}
                >
                  {localProfileName ? (
                    <>
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="font-semibold text-gray-700 uppercase">
                          {localProfileName.charAt(0)}
                        </span>
                      </div>
                      <span>{localProfileName}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        {getIcon('user')}
                      </div>
                      <span>Update Profile</span>
                    </>
                  )}
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4">Update Profile</h2>
            <form onSubmit={handleProfileNameSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="profileName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Your Name
                </label>
                <input
                  type="text"
                  id="profileName"
                  value={localProfileName}
                  onChange={(e) => setLocalProfileName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                  placeholder="Enter your name"
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalHeader;
