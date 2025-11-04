import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS_TOKEN: '@access_token',
  REFRESH_TOKEN: '@refresh_token',
  USER: '@user'
};

export const storage = {
  // Save tokens
  saveTokens: async (accessToken, refreshToken) => {
    try {
      await AsyncStorage.multiSet([
        [KEYS.ACCESS_TOKEN, accessToken],
        [KEYS.REFRESH_TOKEN, refreshToken]
      ]);
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  },

  // Get access token
  getAccessToken: async () => {
    try {
      return await AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  },

  // Get refresh token
  getRefreshToken: async () => {
    try {
      return await AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  },

  // Save user data
  saveUser: async (user) => {
    try {
      await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
    }
  },

  // Get user data
  getUser: async () => {
    try {
      const user = await AsyncStorage.getItem(KEYS.USER);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  // Clear all data (logout)
  clearAll: async () => {
    try {
      await AsyncStorage.multiRemove([
        KEYS.ACCESS_TOKEN,
        KEYS.REFRESH_TOKEN,
        KEYS.USER
      ]);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
};