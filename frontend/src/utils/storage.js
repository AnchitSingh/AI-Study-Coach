/**
 * @fileoverview Local storage utility with promise-based API.
 * 
 * This module provides a wrapper around the browser's localStorage API
 * with a consistent promise-based interface. It handles JSON serialization
 * and deserialization automatically and includes graceful error handling
 * for cases where localStorage is unavailable or quota is exceeded.
 * 
 * The utility provides methods for getting, setting, and removing items
 * from localStorage with automatic JSON conversion for complex data types.
 * 
 * @module storage
 */

// src/utils/storage.js

/**
 * Local storage utility with promise-based API.
 * 
 * Provides a consistent interface for localStorage operations with
 * automatic JSON serialization/deserialization and error handling.
 * 
 * @example
 * // Get a value with default fallback
 * const userProfile = await storage.get('userProfile', { name: 'Guest' });
 * 
 * // Set a value
 * await storage.set('userProfile', { name: 'John', email: 'john@example.com' });
 * 
 * // Remove a value
 * await storage.remove('userProfile');
 */
const storage = {
  /**
   * Get an item from localStorage.
   * 
   * Retrieves and parses a JSON value from localStorage. If the key doesn't
   * exist or parsing fails, returns the provided default value.
   * 
   * @param {string} key - The key to retrieve
   * @param {*} [defaultValue=null] - Default value if key doesn't exist
   * @returns {Promise<*>} Promise resolving to the stored value or default
   * 
   * @example
   * const settings = await storage.get('appSettings', { theme: 'light' });
   */
  get: (key, defaultValue = null) => {
    return new Promise((resolve) => {
      try {
        const value = localStorage.getItem(key);
        resolve(value ? JSON.parse(value) : defaultValue);
      } catch (e) {
        resolve(defaultValue);
      }
    });
  },

  /**
   * Set an item in localStorage.
   * 
   * Serializes and stores a value in localStorage. Automatically handles
   * JSON serialization for objects and arrays.
   * 
   * @param {string} key - The key to store under
   * @param {*} value - The value to store
   * @returns {Promise<boolean>} Promise resolving to true if successful
   * 
   * @example
   * const success = await storage.set('userPreferences', { theme: 'dark', fontSize: 16 });
   */
  set: (key, value) => {
    return new Promise((resolve) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        resolve(true);
      } catch (e) {
        resolve(false);
      }
    });
  },

  /**
   * Remove an item from localStorage.
   * 
   * Removes the specified key-value pair from localStorage.
   * 
   * @param {string} key - The key to remove
   * @returns {Promise<boolean>} Promise resolving to true when removal is complete
   * 
   * @example
   * await storage.remove('temporaryData');
   */
  remove: (key) => {
    return new Promise((resolve) => {
      localStorage.removeItem(key);
      resolve(true);
    });
  },
};

export default storage;
