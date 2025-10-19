/**
 * @fileoverview Rate limiter for controlling concurrent API requests.
 * 
 * This module provides a rate limiting mechanism to control the number of
 * concurrent operations, preventing overwhelming of backend services.
 * It implements a queue-based approach with configurable concurrency limits.
 * 
 * The rate limiter is particularly useful for managing AI API calls where
 * concurrent requests might exceed rate limits or resource constraints.
 * 
 * @module RateLimiter
 */

// src/services/rateLimiter.js

/**
 * Rate limiter class for controlling concurrent operations.
 * 
 * This class implements a queue-based rate limiting mechanism that ensures
 * only a specified number of operations run concurrently. Additional operations
 * are queued and executed when capacity becomes available.
 * 
 * @example
 * const rateLimiter = new RateLimiter(2); // Allow max 2 concurrent operations
 * 
 * rateLimiter.run(async () => {
 *   // This operation will run when concurrency slot is available
 *   const result = await someAsyncOperation();
 *   return result;
 * }).then(result => {
 *   console.log('Operation completed:', result);
 * });
 */
export default class RateLimiter {
  /**
   * Creates a new rate limiter instance.
   * 
   * @param {number} [concurrency=1] - Maximum number of concurrent operations allowed
   */
  constructor(concurrency = 1) {
    /**
     * Maximum number of concurrent operations
     * @type {number}
     */
    this.concurrency = Math.max(1, concurrency);
    
    /**
     * Queue of pending operations
     * @type {Array<Function>}
     */
    this.queue = [];
    
    /**
     * Current number of active operations
     * @type {number}
     */
    this.active = 0;
  }

  /**
   * Runs an operation with rate limiting.
   * 
   * The operation will be queued if the concurrency limit has been reached.
   * It will execute when a slot becomes available.
   * 
   * @param {Function} fn - Async function to execute
   * @returns {Promise<any>} Promise that resolves with the function result
   * 
   * @example
   * const result = await rateLimiter.run(async () => {
   *   return await fetch('/api/data');
   * });
   */
  run(fn) {
    return new Promise((resolve, reject) => {
      const task = async () => {
        this.active++;
        try {
          const res = await fn();
          resolve(res);
        } catch (e) {
          reject(e);
        } finally {
          this.active--;
          this._next();
        }
      };
      this.queue.push(task);
      this._next();
    });
  }

  /**
   * Processes the next operation in the queue if capacity is available.
   * 
   * This internal method is called whenever an operation completes or
   * when a new operation is added to the queue.
   * 
   * @private
   */
  _next() {
    if (this.active >= this.concurrency) return;
    const task = this.queue.shift();
    if (task) task();
  }
}
