// src/utils/summaryProcessor.js

// Chrome Summarizer API wrapper for content processing - FIXED VERSION

let summarizerCache = null;

// Check if Summarizer API is available
export async function checkSummarizerAvailability() {
    if (typeof window === 'undefined' || !window.ai?.summarizer) {
      if (!window.Summarizer) {
        return { available: false, reason: 'API not supported in this browser' };
      }
    }
  
    try {
      const availability = await window.ai?.summarizer?.availability() || await window.Summarizer?.availability();
      
      // FIX: Accept both 'readily' AND 'available' as valid
      const isAvailable = availability === 'readily' || availability === 'available';
      
      return {
        available: isAvailable,
        status: availability,
        downloadNeeded: availability === 'available',  // Model needs download
        reason: !isAvailable ? `Model status: ${availability}` : null
      };
    } catch (error) {
      return { available: false, reason: error.message };
    }
  }
  

// Create a summarizer with quiz-focused context
export async function createSummarizer(options = {}) {
  const {
    quizTopic = '',
    subject = 'General',
    difficulty = 'medium',
    questionTypes = []
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
      length: 'medium'
    });

    summarizerCache = summarizer;
    return summarizer;
  } catch (error) {
    throw new Error(`Failed to create summarizer: ${error.message}`);
  }
}

// Process a single chunk
export async function summarizeChunk(chunk, summarizer, options = {}) {
  if (!chunk?.text || !summarizer) {
    throw new Error('Invalid chunk or summarizer');
  }

  const { context = '' } = options;

  try {
    // Use summarize() with optional context
    const summary = await summarizer.summarize(chunk.text, {
      context: context || 'Extract key educational concepts and facts'
    });

    return {
      id: chunk.id,
      originalLength: chunk.text.length,
      summaryLength: summary.length,
      summary: summary.trim(),
      tokenEstimate: Math.round(summary.length / 4),
      processingTime: Date.now()
    };
  } catch (error) {
    throw new Error(`Summarization failed for ${chunk.id}: ${error.message}`);
  }
}

// Process multiple chunks with progress tracking
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
          status: 'processing'
        });
      }

      const result = await summarizeChunk(chunk, summarizer, {
        context: `Educational content for ${quizConfig.subject || 'general'} quiz`
      });

      results.push(result);
      processedCount++;

      if (onProgress) {
        onProgress({
          current: processedCount,
          total: chunks.length,
          chunkId: chunk.id,
          status: 'completed',
          result
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
        fallback: true
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

// Combine summaries into final content
export function assembleSummaries(summaryResults) {
  if (!summaryResults || summaryResults.length === 0) {
    return { text: '', wordCount: 0, meta: { summaries: 0 } };
  }

  const validSummaries = summaryResults.filter(r => r.summary && r.summary.trim());
  const combinedText = validSummaries.map(r => r.summary).join('\n\n');
  
  const meta = {
    summaries: validSummaries.length,
    totalOriginalLength: summaryResults.reduce((sum, r) => sum + (r.originalLength || 0), 0),
    totalSummaryLength: validSummaries.reduce((sum, r) => sum + (r.summaryLength || 0), 0),
    compressionRatio: summaryResults.reduce((sum, r) => sum + (r.originalLength || 0), 0) / 
                     Math.max(1, validSummaries.reduce((sum, r) => sum + (r.summaryLength || 0), 0)),
    fallbacks: summaryResults.filter(r => r.fallback).length,
    errors: summaryResults.filter(r => r.error).length
  };

  return {
    text: combinedText,
    wordCount: combinedText.split(/\s+/).length,
    meta
  };
}
