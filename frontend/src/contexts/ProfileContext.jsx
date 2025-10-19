/**
 * @fileoverview Profile context for managing user profile data.
 * 
 * This context provides a centralized way to manage user profile information
 * across the application. It handles loading, saving, and updating user
 * profile data using local storage, and provides a clean API for other
 * components to access and modify profile information.
 * 
 * The context includes functions to update profile data and maintains
 * loading and error states for UI feedback.
 * 
 * @module ProfileContext
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import storage from '../utils/storage';

/**
 * Create the Profile Context
 * @type {React.Context}
 */
const ProfileContext = createContext();

/**
 * Action types for profile reducer
 * @type {Object}
 */
const actionTypes = {
  SET_PROFILE: 'SET_PROFILE',
  SET_NAME: 'SET_NAME',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
};

/**
 * Initial state for the profile reducer
 * @type {Object}
 */
const initialState = {
  profile: {
    name: 'Study Enthusiast', // Default name
    email: 'ai.coach@no_email.com',
    createdAt: null,
    lastLogin: new Date().toISOString(),
  },
  loading: true,
  error: null,
};

/**
 * Reducer function to handle profile state updates
 * @param {Object} state - Current state
 * @param {Object} action - Action to perform
 * @param {string} action.type - Type of action
 * @param {*} action.payload - Data for the action
 * @returns {Object} Updated state
 */
const profileReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_PROFILE:
      return {
        ...state,
        profile: { ...state.profile, ...action.payload },
        loading: false,
        error: null,
      };
    case actionTypes.SET_NAME:
      return {
        ...state,
        profile: { ...state.profile, name: action.payload },
        loading: false,
        error: null,
      };
    case actionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    case actionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    default:
      return state;
  }
};

/**
 * Profile Provider component that wraps the application and provides profile context.
 * 
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Child components that will have access to the context
 * @returns {JSX.Element} The provider component
 * 
 * @example
 * <ProfileProvider>
 *   <App />
 * </ProfileProvider>
 */
export const ProfileProvider = ({ children }) => {
  const [state, dispatch] = useReducer(profileReducer, initialState);

  /**
   * Load user profile from storage on mount
   */
  useEffect(() => {
    const loadProfile = async () => {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });
      try {
        const profileData = await storage.get('userProfile');
        if (profileData) {
          dispatch({ type: actionTypes.SET_PROFILE, payload: profileData });
        } else {
          const defaultProfile = {
            name: 'Study Enthusiast',
            email: 'ai.coach@no_email.com',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          };
          dispatch({ type: actionTypes.SET_PROFILE, payload: defaultProfile });
          await storage.set('userProfile', defaultProfile);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        dispatch({ type: actionTypes.SET_ERROR, payload: error.message });
      } finally {
        dispatch({ type: actionTypes.SET_LOADING, payload: false });
      }
    };

    loadProfile();
  }, []);

  /**
   * Update the user's profile name
   * @param {string} newName - New name to set in the profile
   * @returns {Promise<void>} A promise that resolves when the update is complete
   */
  const updateProfileName = async (newName) => {
    dispatch({ type: actionTypes.SET_LOADING, payload: true });
    try {
      const updatedProfile = {
        ...state.profile,
        name: newName,
        lastLogin: new Date().toISOString(),
      };

      await storage.set('userProfile', updatedProfile);
      dispatch({ type: actionTypes.SET_PROFILE, payload: updatedProfile });
    } catch (error) {
      console.error('Error updating profile:', error);
      dispatch({ type: actionTypes.SET_ERROR, payload: error.message });
    } finally {
      dispatch({ type: actionTypes.SET_LOADING, payload: false });
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        ...state,
        updateProfileName,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

/**
 * Custom hook to use the Profile Context.
 * 
 * This hook provides access to the profile state and update functions.
 * It should only be used within components that are descendants of
 * ProfileProvider.
 * 
 * @returns {Object} The profile context value containing state and functions
 * 
 * @throws {Error} If used outside of a ProfileProvider
 * 
 * @example
 * const { profile, updateProfileName, loading } = useProfile();
 */
export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
