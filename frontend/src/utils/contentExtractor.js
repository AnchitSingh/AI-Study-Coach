/**
 * @fileoverview Content extraction and processing with AI summarization support.
 * 
 * This module handles extraction from multiple source types (PDFs, web pages, manual topics)
 * and optionally summarizes long content using AI. It orchestrates the cleaning, chunking,
 * and summarization pipeline to prepare content for quiz generation.
 * 
 * The processing flow:
 * 1. Text extraction from various sources
 * 2. Aggressive cleaning to remove noise
 * 3. Text chunking for manageable processing
 * 4. Optional AI summarization for long content
 * 5. Final packaging with metadata
 * 
 * @module contentExtractor
 */

// Enhanced extractor with summarization integration

import agressiveTextCleaner, { buildExcerpt } from './contentCleaner';
import { chunkText, shouldSummarize } from './textChunker';
import { processChunks, assembleSummaries, checkSummarizerAvailability } from './summaryProcessor';
import { extractReadableFromHTML } from './readabilityClient';
import { SOURCE_TYPE } from './messages';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Progress callback for reporting extraction and processing status.
 * 
 * @callback ProgressCallback
 * @param {Object} progress - Progress information
 * @param {string} progress.status - Status identifier (e.g., 'processing-pdf', 'summarizing')
 * @param {string} progress.message - Human-readable status message
 * @param {number} [progress.progress] - Percentage completion (0-100) for progress bars
 * @param {number} [progress.chunks] - Total number of chunks being processed
 * @param {boolean} [progress.warning] - Indicates a non-critical issue occurred
 * @param {boolean} [progress.error] - Indicates an error occurred but processing continues
 */

/**
 * Configuration for quiz generation.
 * 
 * @typedef {Object} QuizConfig
 * @property {number} [questionCount] - Number of questions to generate
 * @property {string} [difficulty] - Difficulty level (e.g., 'easy', 'medium', 'hard')
 * @property {string} [questionType] - Type of questions (e.g., 'multiple-choice', 'true-false')
 * @property {Object} [additionalSettings] - Additional quiz configuration options
 */

/**
 * Metadata about content processing.
 * 
 * @typedef {Object} ProcessingMeta
 * @property {number} chunksCreated - Number of text chunks created
 * @property {number} originalWordCount - Word count before processing
 * @property {boolean} summarizationAttempted - Whether summarization was attempted
 * @property {boolean} summarizationSucceeded - Whether summarization succeeded
 * @property {number} [finalWordCount] - Word count after summarization
 * @property {number} [compressionRatio] - Ratio of original to final size
 * @property {number} [totalChunks] - Total chunks processed during summarization
 * @property {number} [successfulChunks] - Number of successfully summarized chunks
 */

/**
 * Finalized content source ready for quiz generation.
 * 
 * @typedef {Object} FinalizedSource
 * @property {string} sourceType - Type of source (PDF, MANUAL, WEB, YOUTUBE)
 * @property {string} title - Title or filename of the source
 * @property {string} url - URL of the source (empty for local files)
 * @property {string} domain - Domain name extracted from URL
 * @property {string} excerpt - Short excerpt for preview (max ~240 chars)
 * @property {number} wordCount - Final word count after processing
 * @property {Array<Object>} chunks - Text chunks for processing
 * @property {string} text - Full processed text content
 * @property {Object} meta - Metadata including processing information
 * @property {ProcessingMeta} meta.processing - Processing statistics and status
 */

// ============================================================================
// CORE PROCESSING
// ============================================================================

/**
 * Finalizes a content source by cleaning, chunking, and optionally summarizing.
 * 
 * This is the core processing pipeline that:
 * - Cleans raw text to remove noise and artifacts
 * - Determines if content needs summarization (based on length)
 * - Attempts AI summarization if needed and available
 * - Falls back to truncation if summarization fails
 * - Packages everything into a standardized format
 * 
 * @private
 * @param {Object} options - Source configuration
 * @param {string} options.sourceType - Type of content source (from SOURCE_TYPE)
 * @param {string} options.title - Title or name of the content
 * @param {string} options.url - Source URL (empty string for local content)
 * @param {string} options.rawText - Raw unprocessed text content
 * @param {Object} [options.meta={}] - Additional metadata to include
 * @param {QuizConfig} [options.quizConfig={}] - Quiz generation configuration
 * @param {ProgressCallback} [options.onProgress=null] - Progress reporting callback
 * @returns {Promise<FinalizedSource>} Processed and finalized content source
 * 
 * @example
 * const source = await finalizeSource({
 *   sourceType: SOURCE_TYPE.PDF,
 *   title: 'Sample Document',
 *   url: '',
 *   rawText: 'Long document text...',
 *   quizConfig: { questionCount: 10 },
 *   onProgress: (status) => console.log(status.message)
 * });
 */
async function finalizeSource({
  sourceType,
  title,
  url,
  rawText,
  meta = {},
  quizConfig = {},
  onProgress = null
}) {
  // Clean the raw text to remove HTML, equations, and other artifacts
  const text = agressiveTextCleaner(rawText || '');
  const wordCount = text ? text.split(/\s+/).length : 0;
  const chunks = chunkText(text);

  // Extract domain from URL for metadata
  const domain = (() => {
    try { return url ? new URL(url).hostname : ''; } catch { return ''; }
  })();

  let finalText = text;
  let processingMeta = {
    chunksCreated: chunks.length,
    originalWordCount: wordCount,
    summarizationAttempted: false,
    summarizationSucceeded: false
  };

  // Determine if content is long enough to warrant summarization
  const needsSummarization = shouldSummarize(chunks);

  if (needsSummarization) {
    try {
      // Check if AI summarizer is available in the browser
      if (onProgress) {
        onProgress({
          status: 'checking-summarizer',
          message: 'Checking AI summarizer availability...'
        });
      }

      const availability = await checkSummarizerAvailability();

      if (availability.available) {
        // Summarizer is available - proceed with AI summarization
        if (onProgress) {
          onProgress({
            status: 'summarizing',
            message: `Processing ${chunks.length} chunks with AI...`,
            chunks: chunks.length
          });
        }

        processingMeta.summarizationAttempted = true;

        // Process each chunk through the AI summarizer
        const summaryResults = await processChunks(chunks, quizConfig, (progress) => {
          if (onProgress) {
            onProgress({
              status: 'summarizing-chunk',
              message: `Processing chunk ${progress.current}/${progress.total}...`,
              progress: Math.round((progress.current / progress.total) * 100)
            });
          }
        });

        // Combine all summarized chunks into final text
        const assembled = assembleSummaries(summaryResults);
        console.log('🎯 Assembled summary:', {
          wordCount: assembled.wordCount,
          textLength: assembled.text?.length,
          meta: assembled.meta
        });

        // Validate that summarization produced meaningful output
        if (assembled.text && assembled.wordCount > 50) {
          finalText = assembled.text;
          processingMeta = {
            ...processingMeta,
            summarizationSucceeded: true,
            ...assembled.meta,
            finalWordCount: assembled.wordCount
          };

          if (onProgress) {
            onProgress({
              status: 'summarization-complete',
              message: `Summarized to ${assembled.wordCount} words (${Math.round(assembled.meta.compressionRatio)}x compression)`
            });
          }
        } else {
          // Summarization produced insufficient output - use fallback
          console.warn('🎯 Summarization output insufficient, using fallback');
          finalText = chunks[0]?.text || text.slice(0, 12000);
        }
      } else {
        // Summarizer not available - fall back to first chunk
        console.warn('🎯 Summarizer not available:', availability.reason);
        if (onProgress) {
          onProgress({
            status: 'summarizer-unavailable',
            message: `AI summarizer unavailable: ${availability.reason}. Using first chunk.`,
            warning: true
          });
        }
        finalText = chunks[0]?.text || text.slice(0, 12000);
      }
    } catch (error) {
      // Summarization failed - fall back to first chunk
      console.error('🎯 Summarization failed:', error);
      if (onProgress) {
        onProgress({
          status: 'summarization-failed',
          message: `Summarization failed: ${error.message}. Using first chunk.`,
          error: true
        });
      }
      finalText = chunks[0]?.text || text.slice(0, 12000);
    }
  } else {
    // Content is small enough - use as-is without summarization
    if (onProgress) {
      onProgress({
        status: 'no-summarization-needed',
        message: 'Content is small enough, no summarization needed.'
      });
    }
  }

  // Re-chunk the final text for quiz generation
  // (chunks may be different size after summarization)
  const finalChunks = chunkText(finalText);

  // Return standardized source object
  return {
    sourceType,
    title: title || 'Untitled',
    url: url || '',
    domain,
    excerpt: buildExcerpt(finalText),
    wordCount: finalText.split(/\s+/).length,
    chunks: finalChunks,
    text: finalText,
    meta: {
      ...meta,
      processing: processingMeta
    }
  };
}

// ============================================================================
// SOURCE TYPE EXTRACTORS
// ============================================================================

/**
 * Extracts and processes content from a PDF parsing result.
 * 
 * Takes the output from a PDF parser and runs it through the full processing
 * pipeline including cleaning, chunking, and optional summarization. PDF content
 * often benefits from aggressive cleaning due to formatting artifacts.
 * 
 * @param {Object} pdfResult - Result from PDF parsing
 * @param {string} pdfResult.text - Extracted text content from PDF
 * @param {string} pdfResult.fileName - Name of the PDF file
 * @param {number} [pdfResult.pageCount=0] - Number of pages in the PDF
 * @param {QuizConfig} [quizConfig={}] - Quiz generation configuration
 * @param {ProgressCallback} [onProgress=null] - Progress reporting callback
 * @returns {Promise<FinalizedSource>} Processed PDF content ready for quiz generation
 * 
 * @example
 * const pdfSource = await extractFromPDFResult({
 *   text: extractedText,
 *   fileName: 'textbook.pdf',
 *   pageCount: 45
 * }, { questionCount: 20 }, (status) => {
 *   console.log(status.message);
 * });
 */
export async function extractFromPDFResult({ text, fileName, pageCount = 0 }, quizConfig = {}, onProgress = null) {
  if (onProgress) {
    onProgress({ status: 'processing-pdf', message: `Processing PDF: ${fileName}` });
  }

  return finalizeSource({
    sourceType: SOURCE_TYPE.PDF,
    title: fileName || 'PDF Document',
    url: '',
    rawText: text,
    meta: { pageCount, fileName },
    quizConfig,
    onProgress
  });
}

/**
 * Processes manually entered topic text without summarization.
 * 
 * For user-provided topics and context, this function skips the summarization
 * step since users typically provide concise, relevant text. The content is
 * still cleaned and chunked for consistency with other source types.
 * 
 * @param {string} [topic=''] - Topic title or main subject
 * @param {string} [context=''] - Additional context or description
 * @param {QuizConfig} [quizConfig={}] - Quiz generation configuration
 * @param {ProgressCallback} [onProgress=null] - Progress reporting callback
 * @returns {FinalizedSource} Processed manual topic (returned synchronously)
 * 
 * @example
 * const manualSource = normalizeManualTopic(
 *   'World War II',
 *   'Focus on major battles and key turning points in the European theater',
 *   { difficulty: 'medium' },
 *   (status) => console.log(status.message)
 * );
 */
export function normalizeManualTopic(topic = '', context = '', quizConfig = {}, onProgress = null) {
  // Manual topics are typically short and user-curated, so skip summarization
  if (onProgress) {
    onProgress({ status: 'processing-manual-topic', message: 'Processing custom topic...' });
  }

  // Combine topic and context, clean the text
  const text = agressiveTextCleaner(context || topic);
  const chunks = chunkText(text);

  return {
    sourceType: SOURCE_TYPE.MANUAL,
    title: topic || 'Custom Topic',
    url: '',
    domain: '',
    excerpt: buildExcerpt(text),
    wordCount: text ? text.split(/\s+/).length : 0,
    chunks,
    text,
    meta: {
      processing: {
        chunksCreated: chunks.length,
        originalWordCount: text.split(/\s+/).length,
        summarizationAttempted: false,
        summarizationSucceeded: false
      }
    }
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Re-export summarizer availability checker for convenience.
 * Allows consumers to check if AI summarization is available before processing.
 * 
 * @function checkSummarizerAvailability
 * @returns {Promise<{available: boolean, reason?: string}>} Availability status
 * 
 * @example
 * const { available, reason } = await checkSummarizerAvailability();
 * if (available) {
 *   console.log('AI summarization is ready');
 * } else {
 *   console.log('Summarization unavailable:', reason);
 * }
 */
export { checkSummarizerAvailability };
