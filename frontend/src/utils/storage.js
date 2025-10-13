// src/utils/storage.js

const storage = {
  get: (key, defaultValue = null) => {
    return new Promise((resolve) => {
      try {
        const value = localStorage.getItem(key);
        resolve(value ? JSON.parse(value) : defaultValue);
      } catch (e) {
        resolve(defaultValue);
      }
    });
  },

  set: (key, value) => {
    return new Promise((resolve) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        resolve(true);
      } catch (e) {
        resolve(false);
      }
    });
  },

  remove: (key) => {
    return new Promise((resolve) => {
      localStorage.removeItem(key);
      resolve(true);
    });
  },
};

export default storage;