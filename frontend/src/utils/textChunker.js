// src/utils/textChunker.js

// Updated chunker for summarization: 20K chars per chunk, 200 char overlap

function estimateTokens(text) {
  // More accurate: ~4 chars per token for Gemini Nano
  return Math.round((text || '').length / 4);
}

export function chunkText(text, {
  maxChars = 12000,  // Increased for summarization (fits ~5K tokens)
  minChars = 4000,   // Minimum viable chunk size
  overlap = 200,     // Small overlap for context continuity
  maxChunks = 2      // Limit chunks for performance
} = {}) {
  
  
  
  
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
      needsSummarization: false
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
    const cut = (lastBreak >= minChars) ? i + lastBreak : end;
    
    const part = clean.slice(i, cut);
    const needsSum = part.length > minChars;
    
    
    
    chunks.push({
      id: `chunk_${chunks.length + 1}`,
      text: part,
      start: i,
      end: cut,
      tokenEstimate: estimateTokens(part),
      needsSummarization: needsSum // Flag for summarization
    });

    if (cut >= clean.length) {
      
      break;
    }
    i = Math.max(0, cut - overlap);
    chunkCount++;
  }
  
  
  chunks.forEach((chunk, index) => {
    
  });

  return chunks;
}

// Helper to determine if content needs summarization
export function shouldSummarize(chunks) {
  
  
  
  if (!chunks || chunks.length === 0) {
    
    return false;
  }
  if (chunks.length === 1 && chunks[0].text.length < 4000) {
    
    return false;
  }
  
  const needsSum = chunks.some(chunk => chunk.needsSummarization);
  
  
  return needsSum;
}
