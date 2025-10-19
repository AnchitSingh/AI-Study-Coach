/**
 * @fileoverview Progress bar component for displaying completion percentages.
 * 
 * This component provides a visual representation of progress with customizable
 * colors, labels, and percentage display. It includes smooth transitions and
 * responsive design for different screen sizes.
 * 
 * @module ProgressBar
 */

import React from 'react';

/**
 * Progress bar component for displaying completion percentages.
 * 
 * @param {Object} props - Component properties
 * @param {number} props.progress - Progress percentage (0-100)
 * @param {boolean} [props.showPercentage=true] - Whether to display percentage text
 * @param {string} [props.label] - Optional label text
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {'amber'|'green'|'blue'|'purple'} [props.color='amber'] - Progress bar color scheme
 * 
 * @returns {JSX.Element} The rendered progress bar component
 * 
 * @example
 * <ProgressBar progress={75} label="Quiz Progress" color="green" />
 * 
 * @example
 * <ProgressBar progress={30} showPercentage={false} />
 */
const ProgressBar = ({
  progress,
  showPercentage = true,
  label,
  className = '',
  color = 'amber',
}) => {
  /**
   * CSS classes for different progress bar colors
   * @type {Object}
   */
  const colorClasses = {
    amber: 'bg-gradient-to-r from-amber-500 to-orange-500',
    green: 'bg-gradient-to-r from-green-500 to-emerald-500',
    blue: 'bg-gradient-to-r from-blue-500 to-indigo-500',
    purple: 'bg-gradient-to-r from-purple-500 to-violet-500',
  };

  return (
    <div className={`mb-6 sm:mb-8 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-xs sm:text-sm font-medium text-slate-600">{label}</span>}
          {showPercentage && (
            <span className="text-xs sm:text-sm font-medium text-amber-600">
              {Math.round(progress)}% Complete
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-slate-200 rounded-full h-2 sm:h-2.5">
        <div
          className={`${colorClasses[color]} h-2 sm:h-2.5 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
