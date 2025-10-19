/**
 * @fileoverview Reusable Button component with multiple variants and sizes.
 * 
 * This component provides a consistent, accessible button implementation with
 * multiple styling options, loading states, and icon support. It follows
 * accessibility best practices with proper focus management and ARIA attributes.
 * 
 * The button supports four variants (primary, secondary, danger, ghost) and
 * three sizes (sm, md, lg) with smooth transitions and hover effects.
 * 
 * @module Button
 */

import React from 'react';

/**
 * Reusable button component with multiple variants and states.
 * 
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Button content (text, icons, etc.)
 * @param {Function} [props.onClick] - Click event handler
 * @param {'primary'|'secondary'|'danger'|'ghost'} [props.variant='primary'] - Button style variant
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Button size
 * @param {boolean} [props.disabled=false] - Whether the button is disabled
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {React.ReactNode} [props.icon] - Icon to display before text
 * @param {boolean} [props.loading=false] - Whether to show loading spinner
 * @param {Object} props.props - Additional props to spread to the button element
 * 
 * @returns {JSX.Element} The rendered button component
 * 
 * @example
 * <Button variant="primary" size="md" onClick={() => console.log('clicked')}>
 *   Click Me
 * </Button>
 * 
 * @example
 * <Button variant="secondary" loading={true}>
 *   Processing...
 * </Button>
 */
const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  icon,
  loading = false,
  ...props
}) => {
  /**
   * Base CSS classes shared across all button variants
   * @type {string}
   */
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer active:scale-95';

  /**
   * CSS classes for different button variants
   * @type {Object}
   */
  const variants = {
    primary:
      'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/25 hover:shadow-amber-600/40 hover:scale-105 hover:-translate-y-0.5 focus-visible:ring-amber-600',
    secondary:
      'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-md hover:-translate-y-0.5 focus-visible:ring-slate-500',
    danger:
      'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/25 hover:-translate-y-0.5 focus-visible:ring-red-600',
    ghost:
      'text-slate-600 hover:text-slate-800 hover:bg-slate-100 hover:shadow-sm hover:-translate-y-0.5 focus-visible:ring-slate-500',
  };

  /**
   * CSS classes for different button sizes
   * @type {Object}
   */
  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[2rem]',
    md: 'px-6 py-3 text-base min-h-[2.75rem]',
    lg: 'px-8 py-4 text-lg min-h-[3rem]',
  };

  /**
   * CSS classes applied when button is disabled
   * @type {string}
   */
  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed hover:transform-none hover:shadow-none'
    : '';
    
  /**
   * CSS classes applied when button is in loading state
   * @type {string}
   */
  const loadingClasses = loading ? 'cursor-wait' : '';

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${disabledClasses} ${loadingClasses} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {icon && !loading && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
