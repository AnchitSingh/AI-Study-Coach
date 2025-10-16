// src/utils/messages.js
// Centralizes message types used by the webapp.

export const SOURCE_TYPE = {
  PDF: 'pdf',
  MANUAL: 'manual',
  URL: 'url',
};

// Narrow message helpers (optional)
export const isContentResponseOk = (res) =>
  res && typeof res === 'object' && (res.ok === undefined || res.ok === true);
