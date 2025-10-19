/**
 * @fileoverview Text chunker utility for splitting large content into manageable segments.
 * 
 * This module provides intelligent text chunking functionality designed
 * specifically for AI processing workflows. It splits large documents
 * into appropriately sized segments for summarization, question generation,
 * and other AI operations while maintaining contextual continuity.
 * 
 * Key features include:
 * - Configurable chunk sizing for different AI models
 * - Paragraph-aware splitting to preserve meaning
 * - Overlapping chunks for context continuity
 * - Token estimation for AI model compatibility
 * - Summarization readiness detection
 * 
 * The chunker is optimized for the Gemini Nano model with approximately
 * 4 characters per token ratio and chunk sizes that fit within model limits.
 * 
 * @module textChunker
 */

// src/utils/textChunker.js

// Updated chunker for summarization: 20K chars per chunk, 200 char overlap

/**
 * Estimates token count for text.
 * 
 * Provides approximate token counting based on the 4 chars per token
 * ratio typical for Gemini Nano models. This estimation helps determine
 * if content chunks exceed AI model limits.
 * 
 * @param {string} text - Text to estimate tokens for
 * @returns {number} Estimated token count
 * 
 * @example
 * const tokenCount = estimateTokens('Hello world'); // ~3 tokens
 */
function estimateTokens(text) {
  // More accurate: ~4 chars per token for Gemini Nano
  return Math.round((text || '').length / 4);
}

/**
 * Chunks text into manageable segments for AI processing.
 * 
 * Splits large text documents into appropriately sized chunks while:
 * - Respecting paragraph boundaries when possible
 * - Maintaining overlapping context for continuity
 * - Estimating token counts for AI model compatibility
 * - Flagging chunks that need summarization
 * 
 * @param {string} text - Text to chunk
 * @param {Object} [options] - Chunking configuration
 * @param {number} [options.maxChars=12000] - Maximum characters per chunk (fits ~5K tokens)
 * @param {number} [options.minChars=4000] - Minimum viable chunk size
 * @param {number} [options.overlap=200] - Character overlap for context continuity
 * @param {number} [options.maxChunks=2] - Maximum number of chunks to create
 * @returns {Array<Object>} Array of chunk objects
 * @property {string} id - Unique chunk identifier
 * @property {string} text - Chunk text content
 * @property {number} start - Start position in original text
 * @property {number} end - End position in original text
 * @property {number} tokenEstimate - Estimated token count
 * @property {boolean} needsSummarization - Whether chunk needs AI summarization
 * 
 * @example
 * const chunks = chunkText('Very long text...', {
 *   maxChars: 10000,
 *   overlap: 500
 * });
 * 
 * chunks.forEach(chunk => {
 *   console.log(`Chunk ${chunk.id}: ${chunk.tokenEstimate} tokens`);
 * });
 */
export function chunkText(
  text,
  {
    maxChars = 12000, // Increased for summarization (fits ~5K tokens)
    minChars = 4000, // Minimum viable chunk size
    overlap = 200, // Small overlap for context continuity
    maxChunks = 2, // Limit chunks for performance
  } = {}
) {
  const chunks = [];
  const clean = text || '';

  if (clean.length <= minChars) {
    // Single small chunk - no need to split
    const singleChunk = {
      id: `chunk_1`,
      text: clean,
      start: 0,
      end: clean.length,
      tokenEstimate: estimateTokens(clean),
      needsSummarization: false,
    };

    return [singleChunk];
  }

  let i = 0;
  let chunkCount = 0;

  while (i < clean.length && chunkCount < maxChunks) {
    let end = Math.min(i + maxChars, clean.length);

    // Prefer cut at paragraph boundary if possible
    const slice = clean.slice(i, end);
    const lastBreak = slice.lastIndexOf('\n\n');
    const cut = lastBreak >= minChars ? i + lastBreak : end;

    const part = clean.slice(i, cut);
    const needsSum = part.length > minChars;

    chunks.push({
      id: `chunk_${chunks.length + 1}`,
      text: part,
      start: i,
      end: cut,
      tokenEstimate: estimateTokens(part),
      needsSummarization: needsSum, // Flag for summarization
    });

    if (cut >= clean.length) {
      break;
    }
    i = Math.max(0, cut - overlap);
    chunkCount++;
  }

  chunks.forEach((chunk, index) => {});

  return chunks;
}

/**
 * Determines if content needs summarization based on chunk analysis.
 * 
 * Evaluates whether content chunks are large enough to warrant AI
 * summarization. Small content typically doesn't benefit from
 * summarization and can be processed directly.
 * 
 * @param {Array<Object>} chunks - Array of text chunks to evaluate
 * @returns {boolean} Whether content should be summarized
 * 
 * @example
 * const chunks = chunkText('Very long document...');
 * if (shouldSummarize(chunks)) {
 *   console.log('Content should be summarized before processing');
 * } else {
 *   console.log('Content is small enough for direct processing');
 * }
 */
export function shouldSummarize(chunks) {
  if (!chunks || chunks.length === 0) {
    return false;
  }
  if (chunks.length === 1 && chunks[0].text.length < 4000) {
    return false;
  }

  const needsSum = chunks.some((chunk) => chunk.needsSummarization);

  return needsSum;
}
