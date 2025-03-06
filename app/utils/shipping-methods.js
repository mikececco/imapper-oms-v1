/**
 * Utility functions for handling shipping methods
 */

// Default shipping methods to use as fallback
export const DEFAULT_SHIPPING_METHODS = [
  { id: 1, code: 'standard', name: 'Standard', display_order: 1, active: true },
  { id: 2, code: 'express', name: 'Express', display_order: 2, active: true },
  { id: 3, code: 'priority', name: 'Priority', display_order: 3, active: true },
  { id: 4, code: 'economy', name: 'Economy', display_order: 4, active: true }
];

// Cache for shipping methods
let shippingMethodsCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Fetch shipping methods from the API
 * @param {boolean} activeOnly - Whether to return only active shipping methods
 * @param {boolean} bypassCache - Whether to bypass the cache and force a fresh fetch
 * @returns {Promise<Array>} - Array of shipping methods
 */
export async function fetchShippingMethods(activeOnly = true, bypassCache = false) {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // If not in browser or during SSR, return default methods
  if (!isBrowser) {
    return DEFAULT_SHIPPING_METHODS;
  }
  
  // Check if we have a valid cache
  const now = Date.now();
  if (!bypassCache && shippingMethodsCache && (now - lastFetchTime < CACHE_TTL)) {
    // Filter cache if needed
    return activeOnly 
      ? shippingMethodsCache.filter(method => method.active !== false)
      : shippingMethodsCache;
  }
  
  try {
    // Add cache-busting parameter to prevent caching issues
    const cacheBuster = now;
    const response = await fetch(`/api/shipping-methods?_=${cacheBuster}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.warn(`API returned status ${response.status}`);
      return DEFAULT_SHIPPING_METHODS;
    }
    
    const data = await response.json();
    
    if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
      // Update cache
      shippingMethodsCache = data.data;
      lastFetchTime = now;
      
      // Filter if needed
      return activeOnly 
        ? data.data.filter(method => method.active !== false)
        : data.data;
    } else {
      console.warn('API did not return valid data', data);
      // Return default methods if API doesn't return valid data
      return DEFAULT_SHIPPING_METHODS;
    }
  } catch (error) {
    console.error('Error fetching shipping methods:', error);
    // Return default methods in case of error
    return DEFAULT_SHIPPING_METHODS;
  }
}

/**
 * Get a shipping method by its code
 * @param {Array} methods - Array of shipping methods
 * @param {string} code - Shipping method code
 * @returns {Object|null} - Shipping method object or null if not found
 */
export function getShippingMethodByCode(methods, code) {
  if (!methods || !Array.isArray(methods) || methods.length === 0) {
    return null;
  }
  
  return methods.find(method => method.code === code) || null;
}

/**
 * Get the name of a shipping method by its code
 * @param {Array} methods - Array of shipping methods
 * @param {string} code - Shipping method code
 * @returns {string} - Shipping method name or the code if not found
 */
export function getShippingMethodName(methods, code) {
  const method = getShippingMethodByCode(methods, code);
  return method ? method.name : code;
} 