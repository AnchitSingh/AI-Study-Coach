/**
 * @fileoverview Custom accessible dropdown component with keyboard navigation.
 * 
 * This component provides an accessible dropdown menu with keyboard navigation
 * support, highlighting, and smooth animations. It includes proper ARIA attributes
 * and handles click-outside functionality for better user experience.
 * 
 * @module CustomDropdown
 */

import React, { useState, useEffect, useRef } from 'react';

/**
 * Custom accessible dropdown component with keyboard navigation.
 * 
 * @param {Object} props - Component properties
 * @param {string} [props.label] - Optional label for the dropdown
 * @param {string[]} props.options - Array of option values
 * @param {string} props.value - Currently selected value
 * @param {Function} props.onChange - Callback for value change
 * 
 * @returns {JSX.Element} The rendered dropdown component
 * 
 * @example
 * <CustomDropdown 
 *   label="Select difficulty" 
 *   options={['Easy', 'Medium', 'Hard']} 
 *   value="Medium" 
 *   onChange={(val) => console.log(val)} 
 * />
 */
const CustomDropdown = ({ label, options, value, onChange }) => {
  /**
   * Whether the dropdown is currently open
   * @type {boolean}
   */
  const [isOpen, setIsOpen] = useState(false);
  
  /**
   * Index of the currently highlighted option
   * @type {number}
   */
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  /**
   * Reference to the dropdown container element
   * @type {React.RefObject}
   */
  const dropdownRef = useRef(null);
  
  /**
   * Reference to the dropdown list element
   * @type {React.RefObject}
   */
  const listRef = useRef(null);

  // Handle clicking outside the dropdown to close it
  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * Reset highlighted index when dropdown opens
   */
  useEffect(() => {
    if (isOpen) {
      const currentIndex = options.indexOf(value);
      setHighlightedIndex(currentIndex);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, value, options]);

  /**
   * Scroll highlighted item into view
   */
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [highlightedIndex]);

  /**
   * Handle keyboard navigation for the dropdown
   * @param {KeyboardEvent} e - Keyboard event
   */
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleOptionClick(options[highlightedIndex]);
        }
        break;
      case 'Home':
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlightedIndex(options.length - 1);
        break;
      default:
        break;
    }
  };

  /**
   * Handle option selection
   * @param {*} optionValue - The selected option value
   */
  const handleOptionClick = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  /**
   * Toggle dropdown open/close state
   */
  const toggleDropdown = () => setIsOpen(!isOpen);

  return (
    <div>
      {label && <label className="text-sm font-medium text-slate-700 mb-1.5 block">{label}</label>}
      <div className="relative" ref={dropdownRef}>
        {/* Dropdown Toggle */}
        <button
          type="button"
          onClick={toggleDropdown}
          onKeyDown={handleKeyDown}
          className={`
            w-full flex justify-between items-center px-4 py-3 
            bg-white border rounded-xl text-left
            focus:outline-none focus:ring-2 focus:ring-amber-500
            transition-all duration-200
            ${
              isOpen
                ? 'border-amber-500 shadow-md ring-2 ring-amber-500/20'
                : 'border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
            }
          `}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={`${value === 'All' ? 'text-slate-500' : 'text-slate-800 font-medium'}`}>
            {value}
          </span>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
              isOpen ? 'rotate-180 text-amber-600' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu with Enhanced Animation */}
        <div
          className={`
            absolute top-full mt-2 w-full bg-white rounded-xl 
            shadow-xl border border-slate-200 z-30 overflow-hidden
            transition-all duration-200 ease-out
            ${
              isOpen
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 -translate-y-2 pointer-events-none'
            }
          `}
          style={{ transformOrigin: 'top' }}
        >
          <ul
            ref={listRef}
            className="py-1 max-h-60 overflow-y-auto custom-scrollbar"
            role="listbox"
          >
            {options.length === 0 ? (
              <li className="px-4 py-3 text-slate-500 text-center text-sm">No options available</li>
            ) : (
              options.map((option, index) => {
                const isSelected = option === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={option}
                    onClick={() => handleOptionClick(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`
                      px-4 py-2.5 cursor-pointer transition-all duration-150
                      flex items-center justify-between group
                      ${
                        isSelected
                          ? 'bg-amber-50 text-amber-700 font-medium'
                          : isHighlighted
                            ? 'bg-slate-50 text-slate-900'
                            : 'text-slate-700 hover:bg-slate-50'
                      }
                    `}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="flex-1">{option}</span>
                    {isSelected && (
                      <svg
                        className="w-5 h-5 text-amber-600 animate-scale-in"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
          transition: background 0.2s;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* For Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }

        @keyframes scale-in {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CustomDropdown;
