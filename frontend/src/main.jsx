/**
 * @fileoverview Main entry point for the React application.
 * 
 * This file serves as the entry point for the AI Study Coach application,
 * rendering the main App component into the DOM. It configures the React
 * rendering environment and handles initial application mounting.
 * 
 * Note: StrictMode is intentionally removed to prevent double execution
 * of effects and components during development, which can interfere with
 * certain application behaviors.
 * 
 * @module main
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * Renders the main application component into the DOM.
 * 
 * The application is mounted to the element with ID 'root' in index.html.
 * StrictMode is intentionally omitted to prevent double execution of
 * effects and components during development.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <App /> // Removed <React.StrictMode>
);
