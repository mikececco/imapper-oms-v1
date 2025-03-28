/**
 * HubSpot API integration for customer management
 */

import { HUBSPOT_API_KEY } from './env';

/**
 * Fetch HubSpot owner information for a contact by email
 * @param {string} email - The contact's email address
 * @returns {Promise<Object>} - The HubSpot owner information
 */
export async function fetchHubSpotOwner(email) {
  if (!email) {
    return { success: false, error: 'No email provided' };
  }

  if (!HUBSPOT_API_KEY) {
    return { success: false, error: 'HubSpot API key not configured' };
  }

  try {
    // First, search for the contact by email
    const searchResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'EQ',
              value: email
            }]
          }],
          properties: ['hubspot_owner_id']
        })
      }
    );

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      throw new Error(errorData.message || `HubSpot API error: ${searchResponse.status} ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.results || searchData.results.length === 0) {
      return { success: false, error: 'Contact not found in HubSpot' };
    }

    const contact = searchData.results[0];
    const ownerId = contact.properties.hubspot_owner_id;

    if (!ownerId) {
      return { success: false, error: 'No owner assigned to this contact' };
    }

    // Now, fetch the owner's information
    const ownerResponse = await fetch(
      `https://api.hubapi.com/crm/v3/owners/${ownerId}`,
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!ownerResponse.ok) {
      const errorData = await ownerResponse.json();
      throw new Error(errorData.message || `HubSpot API error: ${ownerResponse.status} ${ownerResponse.statusText}`);
    }

    const ownerData = await ownerResponse.json();
    
    // Format the owner's name
    const ownerName = `${ownerData.firstName} ${ownerData.lastName}`.trim();
    
    return {
      success: true,
      owner: {
        id: ownerData.id,
        name: ownerName,
        email: ownerData.email,
        userId: ownerData.userId
      }
    };
  } catch (error) {
    console.error('Error fetching HubSpot owner:', error);
    return { success: false, error: error.message };
  }
}

export default {
  fetchHubSpotOwner
}; 