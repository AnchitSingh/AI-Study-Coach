/**
 * @fileoverview Centralized message types and helpers for the web application.
 * 
 * This module provides constants and helper functions for consistent
 * messaging throughout the application. It defines source types for
 * different content origins and includes utility functions for validating
 * responses and messages.
 * 
 * The SOURCE_TYPE constants ensure consistent handling of different
 * content sources (PDF, manual input, URLs) across the application.
 * 
 * @module messages
 */

// src/utils/messages.js

/**
 * Source types for content extraction and processing.
 * 
 * Defines the different origins of content that can be used
 * to generate quizzes or stories in the application.
 * 
 * @enum {string}
 */
export const SOURCE_TYPE = {
  /** PDF file source */
  PDF: 'pdf',
  /** Manual/typed content source */
  MANUAL: 'manual',
  /** URL/web content source */
  URL: 'url',
};

/**
 * Helper function to check if a content response is OK.
 * 
 * Validates that a response object exists, is an object type,
 * and either has no 'ok' property or has 'ok' set to true.
 * 
 * @param {Object} res - Response object to check
 * @returns {boolean} Whether the response is considered OK
 * 
 * @example
 * const response = { ok: true, data: 'some data' };
 * if (isContentResponseOk(response)) {
 *   console.log('Response is OK');
 * }
 */
export const isContentResponseOk = (res) =>
  res && typeof res === 'object' && (res.ok === undefined || res.ok === true);
