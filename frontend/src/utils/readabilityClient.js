// src/utils/readabilityClient.js
// Wraps Mozilla Readability; falls back to basic selectors if Readability is unavailable. 
// Intended to run in-page via content script or with HTML passed from content script. 

export function extractReadableFromHTML(html, baseURI = '') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '', 'text/html');
  
    // If Readability is available (global or imported), use it for best results.
    const ReadabilityCtor = (window && window.Readability) ? window.Readability : null;
  
    if (ReadabilityCtor) {
      const clone = doc.cloneNode(true);
      const reader = new ReadabilityCtor(clone, { keepClasses: false, charThreshold: 1200 });
      const article = reader.parse();
      if (article && article.textContent) {
        return {
          title: article.title || doc.title || 'Untitled',
          byline: article.byline || '',
          url: baseURI,
          text: article.textContent || '',
          length: (article.textContent || '').length,
          excerpt: article.excerpt || ''
        };
      }
    }
  
    // Fallback: try common containers
    const main = doc.querySelector('article, main, [role="main"]') || doc.body;
    const text = (main?.innerText || '').trim();
    return {
      title: doc.title || 'Untitled',
      byline: '',
      url: baseURI,
      text,
      length: text.length,
      excerpt: text.slice(0, 240)
    };
  }
  