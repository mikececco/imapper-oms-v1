/**
 * Country code mapping utilities
 */

// Define country code mapping for display and normalization
export const COUNTRY_MAPPING = {
  'US': { code: 'US', name: 'USA', aliases: ['USA', 'UNITED STATES'] },
  'GB': { code: 'GB', name: 'UK', aliases: ['UK', 'UNITED KINGDOM', 'GREAT BRITAIN'] },
  'FR': { code: 'FR', name: 'France', aliases: ['FRANCE', 'FR'] },
  'DE': { code: 'DE', name: 'Germany', aliases: ['GERMANY', 'DE'] },
  'NL': { code: 'NL', name: 'Netherlands', aliases: ['NETHERLANDS', 'NL'] },
};

/**
 * Normalize a country name or code to a standard country code
 * @param {string} country - The country name or code to normalize
 * @returns {string} - The normalized country code, or the original value if no match
 */
export function normalizeCountryToCode(country) {
  if (!country) return 'Unknown';
  
  // Convert to uppercase for consistency
  const upperCountry = country.trim().toUpperCase();
  
  // Check each country mapping
  for (const [code, data] of Object.entries(COUNTRY_MAPPING)) {
    if (upperCountry === code || data.aliases.includes(upperCountry)) {
      return code;
    }
  }
  
  // Return the original if no match
  return upperCountry;
}

/**
 * Get the display name for a country code
 * @param {string} countryCode - The country code
 * @returns {string} - The display name for the country
 */
export function getCountryDisplayName(countryCode) {
  if (countryCode === 'all') return 'All Orders';
  if (countryCode === 'Unknown') return 'Unknown';
  
  return COUNTRY_MAPPING[countryCode]?.name || countryCode;
} 