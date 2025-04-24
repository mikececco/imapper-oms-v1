import { format, parseISO, differenceInDays } from 'date-fns';

/**
 * Format a date string into a human-readable format
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date string
 */
export function formatDate(dateString) {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

// New helper function to calculate days since a date
export function calculateDaysSince(dateString) {
  if (!dateString) return null; // Return null if no date provided
  try {
    const date = parseISO(dateString);
    const today = new Date();
    // Calculate the difference in calendar days
    return differenceInDays(today, date);
  } catch (error) {
    console.error('Error calculating days since:', error);
    return null; // Return null on error
  }
} 