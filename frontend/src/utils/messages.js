// src/utils/messages.js
// Centralizes message types used between side panel/pages and the content script. 

export const MSG = {
    EXTRACT_DOM_HTML: 'EXTRACT_DOM_HTML',       // Return { html, title, url }
    EXTRACT_SELECTION: 'EXTRACT_SELECTION',     // Return { text, title, url }
    EXTRACT_META: 'EXTRACT_META',               // Return { title, url, language? }
    PING_CONTENT: 'PING_CONTENT'                // Health check for content script
  };
  
  export const SOURCE_TYPE = {
    PAGE: 'page',
    SELECTION: 'selection',
    PDF: 'pdf',
    MANUAL: 'manual',
    URL: 'url'
  };
  
  // Narrow message helpers (optional)
  export const isContentResponseOk = (res) =>
    res && typeof res === 'object' && (res.ok === undefined || res.ok === true);
  