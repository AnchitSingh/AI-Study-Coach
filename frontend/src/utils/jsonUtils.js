/**
 * @fileoverview JSON utility functions for sanitizing and processing AI responses.
 * 
 * This module provides utility functions for handling JSON data, particularly
 * focusing on sanitizing raw JSON strings received from AI models. It handles
 * common formatting issues like markdown code blocks, control characters, and
 * extraneous whitespace that can cause parsing errors.
 * 
 * The utilities are especially useful for processing AI-generated JSON responses
 * which often include markdown formatting or contain escaped control characters
 * that need to be properly handled before parsing.
 * 
 * @module jsonUtils
 */

// src/utils/jsonUtils.js

/**
 * Sanitizes a JSON string by removing control characters and extraneous formatting.
 * 
 * This function prepares raw JSON strings from AI models for parsing by:
 * - Removing markdown code block markers (```json)
 * - Trimming whitespace
 * - Properly escaping control characters within strings
 * 
 * @param {string} jsonString - The raw string from the AI
 * @returns {string} A cleaner JSON string ready for parsing
 * 
 * @example
 * const dirtyJson = '```json\\n{\\n  "name": "John\\nDoe"\\n}\\n```';
 * const cleanJson = sanitizeJSON(dirtyJson);
 * const parsed = JSON.parse(cleanJson); // Successfully parses
 */
export function sanitizeJSON(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    return '';
  }

  // Remove leading/trailing whitespace and code block markers
  let cleaned = jsonString.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Replace escaped control characters within strings
  return cleaned
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r')
    .replace(/\b/g, '\\b')
    .replace(/\f/g, '\\f');
}
