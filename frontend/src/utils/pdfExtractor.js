// src/utils/pdfExtractor.js
// Client-side PDF text extraction via PDF.js
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

// This Vite-specific import gets the URL of the worker file after it's been
// processed and copied to the dist folder. This is a robust way to handle workers.
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export async function extractTextFromPDF(input) {
  const lib = pdfjsLib;

  // Support File/Blob/ArrayBuffer/URL
  let data;
  if (input instanceof Blob) {
    data = await input.arrayBuffer();
  } else if (typeof input === 'string') {
    data = input; // URL string
  } else if (input instanceof ArrayBuffer) {
    data = input;
  } else {
    throw new Error('Unsupported PDF input; provide File/Blob/ArrayBuffer/URL.');
  }

  const loadingTask = lib.getDocument(data);
  const pdf = await loadingTask.promise;
  const meta = { pageCount: pdf.numPages };

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((it) => it.str).filter(Boolean);
    fullText += strings.join(' ') + '\n\n';
  }

  return {
    text: fullText.trim(),
    meta
  };
}
