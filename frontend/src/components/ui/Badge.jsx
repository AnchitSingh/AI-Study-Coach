/**
 * @fileoverview Badge component with multiple variants and sizes.
 * 
 * This component provides a consistent badge implementation with multiple
 * styling options to indicate different types of information such as status,
 * notifications, counts, or categories. It supports various color schemes
 * and sizes for different contexts.
 * 
 * @module Badge
 */

import React from 'react';

/**
 * Reusable badge component with multiple variants and sizes.
 * 
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Content to display inside the badge
 * @param {'default'|'primary'|'success'|'danger'|'warning'|'info'|'purple'} [props.variant='default'] - Badge color variant
 * @param {'xs'|'sm'|'md'} [props.size='sm'] - Badge size
 * @param {string} [props.className=''] - Additional CSS classes
 * 
 * @returns {JSX.Element} The rendered badge component
 * 
 * @example
 * <Badge variant="primary" size="md">New</Badge>
 * 
 * @example
 * <Badge variant="success">Completed</Badge>
 */
const Badge = ({ children, variant = 'default', size = 'sm', className = '' }) => {
  /**
   * CSS classes for different badge variants
   * @type {Object}
   */
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-amber-100 text-amber-700',
    success: 'bg-green-100 text-green-700',
    danger: 'bg-red-100 text-red-700',
    warning: 'bg-orange-100 text-orange-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  };

  /**
   * CSS classes for different badge sizes
   * @type {Object}
   */
  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
