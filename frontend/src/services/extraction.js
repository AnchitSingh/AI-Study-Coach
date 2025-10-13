// src/services/extraction.js
// Frontend extraction service for communicating with the content script (DOM/selection/meta).

import { MSG } from '../utils/messages';

function isExtensionContext() {
    return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.tabs;
}

async function getActiveTabId() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || !tabs[0]) throw new Error('No active tab found.');
    return tabs[0].id;
}

async function sendToTab(tabId, message) {
    if (!isExtensionContext()) {
        throw new Error('Extraction requires Chrome extension context with content script loaded.');
    }
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            const err = chrome.runtime.lastError;
            if (err) return reject(new Error(err.message || 'Failed to reach content script.'));
            resolve(response);
        });
    });
}

async function sendToActiveTab(message) {
    const tabId = await getActiveTabId();
    return sendToTab(tabId, message);
}

async function pingContent(tabId = null) {
    try {
        const message = { type: MSG.PING_CONTENT };
        if (tabId) {
            await sendToTab(tabId, message);
        } else {
            await sendToActiveTab(message);
        }
        return true;
    } catch {
        return false;
    }
}

async function getDOMHTML(tabId = null) {
    const targetTabId = tabId || await getActiveTabId();
    const ok = await pingContent(targetTabId);
    if (!ok) throw new Error('Content script not available on this page.');
    const res = await sendToTab(targetTabId, { type: MSG.EXTRACT_DOM_HTML });
    if (!res || !res.html) throw new Error('Failed to extract DOM HTML.');
    return res; // { html, title, url }
}

async function getSelectionText(tabId = null) {
    const targetTabId = tabId || await getActiveTabId();
    const ok = await pingContent(targetTabId);
    if (!ok) throw new Error('Content script not available on this page.');
    const res = await sendToTab(targetTabId, { type: MSG.EXTRACT_SELECTION });
    if (!res || !res.text) throw new Error('No selection text found.');
    return res; // { text, title, url }
}

async function getMeta(tabId = null) {
    const targetTabId = tabId || await getActiveTabId();
    const ok = await pingContent(targetTabId);
    if (!ok) throw new Error('Content script not available on this page.');
    const res = await sendToTab(targetTabId, { type: MSG.EXTRACT_META });
    return res || {};
}

const extractionService = {
    pingContent,
    getDOMHTML,
    getSelectionText,
    getMeta,
    sendToTab
};

export default extractionService;
