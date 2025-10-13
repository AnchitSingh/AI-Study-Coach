import React, { createContext, useContext, useReducer, useEffect } from 'react';
import storage from '../utils/storage';

// Create the Profile Context
const ProfileContext = createContext();

// Action types
const actionTypes = {
    SET_PROFILE: 'SET_PROFILE',
    SET_NAME: 'SET_NAME',
    SET_LOADING: 'SET_LOADING',
    SET_ERROR: 'SET_ERROR',
};

// Initial state
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

// Reducer function
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

// Profile Provider component
export const ProfileProvider = ({ children }) => {
    const [state, dispatch] = useReducer(profileReducer, initialState);

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

    // Function to update profile name
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

// Custom hook to use the Profile Context
export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (!context) {
        throw new Error('useProfile must be used within a ProfileProvider');
    }
    return context;
};