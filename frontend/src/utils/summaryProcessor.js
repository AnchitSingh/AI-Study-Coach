/**
 * @fileoverview Summary processor utility for AI-powered content summarization.
 * 
 * This module provides a comprehensive interface for processing large text
 * content through AI summarization. It handles browser compatibility checks,
 * summarizer creation with educational context, chunked processing with
 * progress tracking, and final summary assembly.
 * 
 * Key features include:
 * - Browser API availability detection
 * - Educational context-aware summarization
 * - Chunked processing for large documents
 * - Progress tracking and error handling
 * - Graceful fallbacks for failed chunks
 * - Resource cleanup and memory management
 * 
 * The processor is optimized for educational content and quiz generation,
 * with built-in context to focus summarization on key learning concepts.
 * 
 * @module summaryProcessor
 */

// src/utils/summaryProcessor.js

/**
 * Cached summarizer instance for reuse
 * @type {Object|null}
 */
let summarizerCache = null;

/**
 * Check if Summarizer API is available.
 * 
 * Detects browser support for the AI Summarizer API and checks
 * model availability status. Handles both modern window.ai
 * and legacy window.Summarizer interfaces.
 * 
 * @returns {Promise<Object>} Availability status
 * @property {boolean} available - Whether summarizer is available
 * @property {string} [status] - Model status ('readily', 'available', etc.)
 * @property {boolean} [downloadNeeded] - Whether model needs downloading
 * @property {string} [reason] - Reason for unavailability if not available
 * 
 * @example
 * const availability = await checkSummarizerAvailability();
 * if (availability.available) {
 *   console.log('Summarizer is ready for use');
 * } else {
 *   console.warn('Summarizer unavailable:', availability.reason);
 * }
 */
export async function checkSummarizerAvailability() {
  if (typeof window === 'undefined' || !window.ai?.summarizer) {
    if (!window.Summarizer) {
      return { available: false, reason: 'API not supported in this browser' };
    }
  }

  try {
    const availability =
      (await window.ai?.summarizer?.availability()) || (await window.Summarizer?.availability());

    // FIX: Accept both 'readily' AND 'available' as valid
    const isAvailable = availability === 'readily' || availability === 'available';

    return {
      available: isAvailable,
      status: availability,
      downloadNeeded: availability === 'available', // Model needs download
      reason: !isAvailable ? `Model status: ${availability}` : null,
    };
  } catch (error) {
    return { available: false, reason: error.message };
  }
}

/**
 * Create a summarizer with quiz-focused context.
 * 
 * Initializes a summarizer instance optimized for educational content
 * with context that focuses summarization on key learning concepts.
 * Configures summarizer for key points extraction in plain text format.
 * 
 * @param {Object} [options={}] - Summarizer configuration
 * @param {string} [options.quizTopic=''] - Specific quiz topic
 * @param {string} [options.subject='General'] - Subject area
 * @param {string} [options.difficulty='medium'] - Difficulty level
 * @param {Array<string>} [options.questionTypes=[]] - Target question types
 * @returns {Promise<Object>} Summarizer instance
 * 
 * @throws {Error} If summarizer creation fails
 * 
 * @example
 * const summarizer = await createSummarizer({
 *   quizTopic: 'World War II',
 *   subject: 'History',
 *   difficulty: 'hard'
 * });
 */
export async function createSummarizer(options = {}) {
  const {
    quizTopic = '',
    subject = 'General',
    difficulty = 'medium',
    questionTypes = [],
  } = options;

  // Build context to focus summarization on quiz needs
  const contextParts = ['Focus on key concepts for educational quizzes'];
  if (quizTopic) contextParts.push(`Topic: ${quizTopic}`);
  if (subject !== 'General') contextParts.push(`Subject: ${subject}`);
  if (difficulty !== 'medium') contextParts.push(`Difficulty: ${difficulty}`);
  if (questionTypes.length > 0) contextParts.push(`Question types: ${questionTypes.join(', ')}`);

  const sharedContext = contextParts.join('. ');

  try {
    // Use either window.ai.summarizer or window.Summarizer (legacy)
    const SummarizerAPI = window.ai?.summarizer || window.Summarizer;

    if (!SummarizerAPI) {
      throw new Error('Summarizer API not found');
    }

    const summarizer = await SummarizerAPI.create({
      sharedContext,
      type: 'key-points',
      format: 'plain-text',
      length: 'medium',
    });

    summarizerCache = summarizer;
    return summarizer;
  } catch (error) {
    throw new Error(`Failed to create summarizer: ${error.message}`);
  }
}

/**
 * Process a single chunk through AI summarization.
 * 
 * Sends a text chunk to the summarizer with educational context
 * and returns a structured result with metadata. Handles errors
 * gracefully and provides timing information.
 * 
 * @param {Object} chunk - Text chunk to summarize
 * @param {Object} summarizer - Summarizer instance
 * @param {Object} [options={}] - Processing options
 * @param {string} [options.context=''] - Additional summarization context
 * @returns {Promise<Object>} Summarization result
 * @property {string} id - Chunk identifier
 * @property {number} originalLength - Original text length
 * @property {number} summaryLength - Summary text length
 * @property {string} summary - Summarized text
 * @property {number} tokenEstimate - Estimated token count
 * @property {number} processingTime - Processing timestamp
 * 
 * @throws {Error} If summarization fails
 * 
 * @example
 * const chunk = { id: 'chunk_1', text: 'Large text content...' };
 * const summarizer = await createSummarizer();
 * const result = await summarizeChunk(chunk, summarizer);
 * console.log(`Summary: ${result.summary}`);
 */
export async function summarizeChunk(chunk, summarizer, options = {}) {
  if (!chunk?.text || !summarizer) {
    throw new Error('Invalid chunk or summarizer');
  }

  const { context = '' } = options;

  try {
    // Use summarize() with optional context
    const summary = await summarizer.summarize(chunk.text, {
      context: context || 'Extract key educational concepts and facts',
    });

    return {
      id: chunk.id,
      originalLength: chunk.text.length,
      summaryLength: summary.length,
      summary: summary.trim(),
      tokenEstimate: Math.round(summary.length / 4),
      processingTime: Date.now(),
    };
  } catch (error) {
    throw new Error(`Summarization failed for ${chunk.id}: ${error.message}`);
  }
}

/**
 * Process multiple chunks with progress tracking.
 * 
 * Processes an array of text chunks through AI summarization with
 * progress callbacks and error handling. Manages summarizer lifecycle
 * and provides detailed feedback on processing status.
 * 
 * @param {Array<Object>} chunks - Array of text chunks to process
 * @param {Object} [quizConfig={}] - Quiz configuration for context
 * @param {Function} [onProgress=null] - Progress callback function
 * @returns {Promise<Array<Object>>} Array of summarization results
 * @property {string} id - Chunk identifier
 * @property {number} originalLength - Original text length
 * @property {number} summaryLength - Summary text length
 * @property {string} summary - Summarized text
 * @property {number} tokenEstimate - Estimated token count
 * @property {string} [error] - Error message if processing failed
 * @property {boolean} [fallback] - Whether fallback was used
 * 
 * @throws {Error} If no chunks to process or summarizer unavailable
 * 
 * @example
 * const chunks = chunkText('Very long document...');
 * const results = await processChunks(chunks, {
 *   subject: 'Biology',
 *   difficulty: 'medium'
 * }, (progress) => {
 *   console.log(`Processed ${progress.current}/${progress.total} chunks`);
 * });
 */
export async function processChunks(chunks, quizConfig = {}, onProgress = null) {
  if (!chunks || chunks.length === 0) {
    throw new Error('No chunks to process');
  }

  const availability = await checkSummarizerAvailability();
  if (!availability.available) {
    throw new Error(`Summarizer unavailable: ${availability.reason}`);
  }

  const summarizer = await createSummarizer(quizConfig);
  const results = [];
  let processedCount = 0;

  for (const chunk of chunks) {
    try {
      if (onProgress) {
        onProgress({
          current: processedCount + 1,
          total: chunks.length,
          chunkId: chunk.id,
          status: 'processing',
        });
      }

      const result = await summarizeChunk(chunk, summarizer, {
        context: `Educational content for ${quizConfig.subject || 'general'} quiz`,
      });

      results.push(result);
      processedCount++;

      if (onProgress) {
        onProgress({
          current: processedCount,
          total: chunks.length,
          chunkId: chunk.id,
          status: 'completed',
          result,
        });
      }
    } catch (error) {
      console.error(`Failed to process chunk ${chunk.id}:`, error);

      // Add fallback with original text (truncated)
      results.push({
        id: chunk.id,
        originalLength: chunk.text.length,
        summary: chunk.text.slice(0, Math.min(2000, chunk.text.length)),
        summaryLength: Math.min(2000, chunk.text.length),
        tokenEstimate: Math.round(Math.min(2000, chunk.text.length) / 4),
        error: error.message,
        fallback: true,
      });
      processedCount++;
    }
  }

  // Cleanup
  if (summarizerCache) {
    try {
      summarizerCache.destroy?.();
    } catch (e) {
      console.warn('Failed to cleanup summarizer:', e);
    }
    summarizerCache = null;
  }

  return results;
}

/**
 * Combine summaries into final content.
 * 
 * Merges multiple chunk summaries into a cohesive final text with
 * metadata about the summarization process. Calculates compression
 * ratios and tracks fallback/error statistics.
 * 
 * @param {Array<Object>} summaryResults - Array of summarization results
 * @returns {Object} Combined summary with metadata
 * @property {string} text - Combined summary text
 * @property {number} wordCount - Word count of combined text
 * @property {Object} meta - Processing metadata
 * @property {number} meta.summaries - Number of valid summaries
 * @property {number} meta.totalOriginalLength - Total original text length
 * @property {number} meta.totalSummaryLength - Total summary length
 * @property {number} meta.compressionRatio - Compression ratio achieved
 * @property {number} meta.fallbacks - Number of chunks using fallback
 * @property {number} meta.errors - Number of processing errors
 * 
 * @example
 * const summaryResults = await processChunks(chunks);
 * const finalSummary = assembleSummaries(summaryResults);
 * console.log(`Compression ratio: ${finalSummary.meta.compressionRatio.toFixed(2)}x`);
 */
export function assembleSummaries(summaryResults) {
  if (!summaryResults || summaryResults.length === 0) {
    return { text: '', wordCount: 0, meta: { summaries: 0 } };
  }

  const validSummaries = summaryResults.filter((r) => r.summary && r.summary.trim());
  const combinedText = validSummaries.map((r) => r.summary).join('\n\n');

  const meta = {
    summaries: validSummaries.length,
    totalOriginalLength: summaryResults.reduce((sum, r) => sum + (r.originalLength || 0), 0),
    totalSummaryLength: validSummaries.reduce((sum, r) => sum + (r.summaryLength || 0), 0),
    compressionRatio:
      summaryResults.reduce((sum, r) => sum + (r.originalLength || 0), 0) /
      Math.max(
        1,
        validSummaries.reduce((sum, r) => sum + (r.summaryLength || 0), 0)
      ),
    fallbacks: summaryResults.filter((r) => r.fallback).length,
    errors: summaryResults.filter((r) => r.error).length,
  };

  return {
    text: combinedText,
    wordCount: combinedText.split(/\s+/).length,
    meta,
  };
}
