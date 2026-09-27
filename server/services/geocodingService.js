import axios from 'axios';

/**
 * Geocoding Service - FREE Nominatim (OpenStreetMap)
 * No API key required - just respect rate limits (1 req/sec)
 */

// Forward geocoding: address → coordinates
export async function geocodeAddress(address) {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'ResQAI-Food-Rescue-Platform/1.0'
      }
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('Address not found');
    }

    const result = response.data[0];
    return {
      coordinates: [parseFloat(result.lon), parseFloat(result.lat)], // [lng, lat] for MongoDB
      displayName: result.display_name
    };
  } catch (error) {
    console.error('Geocoding error:', error.message);
    throw new Error('Failed to geocode address');
  }
}

// Reverse geocoding: coordinates → address
export async function reverseGeocode(lat, lng) {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat: lat,
        lon: lng,
        format: 'json'
      },
      headers: {
        'User-Agent': 'ResQAI-Food-Rescue-Platform/1.0'
      }
    });

    if (!response.data) {
      throw new Error('Location not found');
    }

    return {
      address: response.data.display_name,
      city: response.data.address?.city || response.data.address?.town || 'Unknown',
      state: response.data.address?.state || 'Unknown'
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    throw new Error('Failed to reverse geocode');
  }
}

// Helper: Add delay to respect rate limits (1 request per second)
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
