// src/utils/contentExtractor.js

// Enhanced extractor with summarization integration

import cleanSelectionText, {buildExcerpt} from './contentCleaner';
import { chunkText, shouldSummarize } from './textChunker';
import { processChunks, assembleSummaries, checkSummarizerAvailability } from './summaryProcessor';
import { extractReadableFromHTML } from './readabilityClient';
import { SOURCE_TYPE } from './messages';

async function finalizeSource({
  sourceType,
  title,
  url,
  rawText,
  meta = {},
  quizConfig = {},
  onProgress = null
}) {
  const text = cleanSelectionText(rawText || '');
  const wordCount = text ? text.split(/\s+/).length : 0;
  const chunks = chunkText(text);

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

  // Check if summarization is needed and available
  const needsSummarization = shouldSummarize(chunks);


  if (needsSummarization) {

    try {
      if (onProgress) {
        onProgress({
          status: 'checking-summarizer',
          message: 'Checking AI summarizer availability...'
        });
      }

      const availability = await checkSummarizerAvailability();


      if (availability.available) {

        if (onProgress) {
          onProgress({
            status: 'summarizing',
            message: `Processing ${chunks.length} chunks with AI...`,
            chunks: chunks.length
          });
        }

        processingMeta.summarizationAttempted = true;

        const summaryResults = await processChunks(chunks, quizConfig, (progress) => {

          if (onProgress) {
            onProgress({
              status: 'summarizing-chunk',
              message: `Processing chunk ${progress.current}/${progress.total}...`,
              progress: Math.round((progress.current / progress.total) * 100)
            });
          }
        });


        const assembled = assembleSummaries(summaryResults);
        console.log('🎯 Assembled summary:', {
          wordCount: assembled.wordCount,
          textLength: assembled.text?.length,
          meta: assembled.meta
        });

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

        }
      } else {
        console.warn('🎯 Summarizer not available:', availability.reason);
        if (onProgress) {
          onProgress({
            status: 'summarizer-unavailable',
            message: `AI summarizer unavailable: ${availability.reason}. Using first chunk.`,
            warning: true
          });
        }
        // Fallback to first chunk
        finalText = chunks[0]?.text || text.slice(0, 12000);
      }
    } catch (error) {
      console.error('🎯 Summarization failed:', error);
      if (onProgress) {
        onProgress({
          status: 'summarization-failed',
          message: `Summarization failed: ${error.message}. Using first chunk.`,
          error: true
        });
      }
      // Fallback to first chunk
      finalText = chunks[0]?.text || text.slice(0, 12000);
    }
  } else {
    // Small content, use as-is

    if (onProgress) {
      onProgress({
        status: 'no-summarization-needed',
        message: 'Content is small enough, no summarization needed.'
      });
    }
  }

  // Rechunk the final text for quiz generation
  const finalChunks = chunkText(finalText);




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

export function normalizeManualTopic(topic = '', context = '', quizConfig = {}, onProgress = null) {
  // Manual topics don't need summarization
  if (onProgress) {
    onProgress({ status: 'processing-manual-topic', message: 'Processing custom topic...' });
  }

  const text = cleanSelectionText(context || topic);
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

// Helper for checking summarizer status
export { checkSummarizerAvailability };
