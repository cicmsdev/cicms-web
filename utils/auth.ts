import { jwtDecode } from "jwt-decode";

/**
 * Retrieves the authentication token from localStorage
 * @returns {string | null} The stored JWT token or null if not found/not in browser environment
 */
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem('access_token');
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return null;
  }
};

/**
 * Stores the authentication token in localStorage
 * @param {string} token - The JWT token to store
 */
export const setToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('access_token', token);
  } catch (error) {
    console.error('Error storing token:', error);
  }
};

/**
 * Removes the authentication token from localStorage
 */
export const removeToken = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('access_token');
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

/**
 * Checks if a valid token exists
 * @returns {boolean} True if token exists and is valid
 */
export const hasValidToken = (): boolean => {
  const token = getToken();
  return token !== null && token.length > 0;
};

/**
 * Checks if token is expired
 * @param {string} token - The JWT token to check
 * @returns {boolean} True if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode<{ exp: number }>(token);
    return decoded.exp < Date.now() / 1000;
  } catch {
    return true;
  }
};