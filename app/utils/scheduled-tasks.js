/**
 * Scheduled tasks for the application
 */

import { batchUpdateDeliveryStatus } from './sendcloud';

/**
 * Update delivery status for orders with tracking links
 * @param {number} limit - Maximum number of orders to update
 * @returns {Promise<Object>} - Results of the batch update
 */
export async function scheduledDeliveryStatusUpdate(limit = 100) {
  console.log(`[${new Date().toISOString()}] Running scheduled delivery status update...`);
  
  try {
    const result = await batchUpdateDeliveryStatus(limit);
    
    console.log(`[${new Date().toISOString()}] Delivery status update completed:`, {
      success: result.success,
      totalProcessed: result.totalProcessed || 0,
      successfulUpdates: result.successfulUpdates || 0,
      failedUpdates: result.failedUpdates || 0
    });
    
    return result;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in scheduled delivery status update:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Run all scheduled tasks
 * @returns {Promise<Object>} - Results of all scheduled tasks
 */
export async function runAllScheduledTasks() {
  console.log(`[${new Date().toISOString()}] Running all scheduled tasks...`);
  
  const results = {
    deliveryStatusUpdate: await scheduledDeliveryStatusUpdate()
  };
  
  console.log(`[${new Date().toISOString()}] All scheduled tasks completed.`);
  
  return results;
}

export default {
  scheduledDeliveryStatusUpdate,
  runAllScheduledTasks
}; 