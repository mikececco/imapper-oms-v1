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
  'IT': { code: 'IT', name: 'Italy', aliases: ['ITALY', 'IT'] },
  
  // Additional European countries
  'AD': { code: 'AD', name: 'Andorra', aliases: ['ANDORRA'] },
  'AL': { code: 'AL', name: 'Albania', aliases: ['ALBANIA'] },
  'AT': { code: 'AT', name: 'Austria', aliases: ['AUSTRIA'] },
  'BA': { code: 'BA', name: 'Bosnia and Herzegovina', aliases: ['BOSNIA', 'BOSNIA AND HERZEGOVINA'] },
  'BE': { code: 'BE', name: 'Belgium', aliases: ['BELGIUM'] },
  'BG': { code: 'BG', name: 'Bulgaria', aliases: ['BULGARIA'] },
  'BY': { code: 'BY', name: 'Belarus', aliases: ['BELARUS'] },
  'CH': { code: 'CH', name: 'Switzerland', aliases: ['SWITZERLAND'] },
  'CY': { code: 'CY', name: 'Cyprus', aliases: ['CYPRUS'] },
  'CZ': { code: 'CZ', name: 'Czech Republic', aliases: ['CZECH REPUBLIC', 'CZECHIA'] },
  'DK': { code: 'DK', name: 'Denmark', aliases: ['DENMARK'] },
  'EE': { code: 'EE', name: 'Estonia', aliases: ['ESTONIA'] },
  'ES': { code: 'ES', name: 'Spain', aliases: ['SPAIN'] },
  'FI': { code: 'FI', name: 'Finland', aliases: ['FINLAND'] },
  'GR': { code: 'GR', name: 'Greece', aliases: ['GREECE'] },
  'HR': { code: 'HR', name: 'Croatia', aliases: ['CROATIA'] },
  'HU': { code: 'HU', name: 'Hungary', aliases: ['HUNGARY'] },
  'IE': { code: 'IE', name: 'Ireland', aliases: ['IRELAND'] },
  'IS': { code: 'IS', name: 'Iceland', aliases: ['ICELAND'] },
  'LI': { code: 'LI', name: 'Liechtenstein', aliases: ['LIECHTENSTEIN'] },
  'LT': { code: 'LT', name: 'Lithuania', aliases: ['LITHUANIA'] },
  'LU': { code: 'LU', name: 'Luxembourg', aliases: ['LUXEMBOURG'] },
  'LV': { code: 'LV', name: 'Latvia', aliases: ['LATVIA'] },
  'MC': { code: 'MC', name: 'Monaco', aliases: ['MONACO'] },
  'MD': { code: 'MD', name: 'Moldova', aliases: ['MOLDOVA'] },
  'ME': { code: 'ME', name: 'Montenegro', aliases: ['MONTENEGRO'] },
  'MK': { code: 'MK', name: 'North Macedonia', aliases: ['NORTH MACEDONIA', 'MACEDONIA'] },
  'MT': { code: 'MT', name: 'Malta', aliases: ['MALTA'] },
  'NO': { code: 'NO', name: 'Norway', aliases: ['NORWAY'] },
  'PL': { code: 'PL', name: 'Poland', aliases: ['POLAND'] },
  'PT': { code: 'PT', name: 'Portugal', aliases: ['PORTUGAL'] },
  'RO': { code: 'RO', name: 'Romania', aliases: ['ROMANIA'] },
  'RS': { code: 'RS', name: 'Serbia', aliases: ['SERBIA'] },
  'SE': { code: 'SE', name: 'Sweden', aliases: ['SWEDEN'] },
  'SI': { code: 'SI', name: 'Slovenia', aliases: ['SLOVENIA'] },
  'SK': { code: 'SK', name: 'Slovakia', aliases: ['SLOVAKIA'] },
  'SM': { code: 'SM', name: 'San Marino', aliases: ['SAN MARINO'] },
  'UA': { code: 'UA', name: 'Ukraine', aliases: ['UKRAINE'] },
  'VA': { code: 'VA', name: 'Vatican City', aliases: ['VATICAN', 'VATICAN CITY', 'HOLY SEE'] },
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