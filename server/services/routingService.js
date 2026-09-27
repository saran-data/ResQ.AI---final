import axios from 'axios';

/**
 * Routing Service - FREE OSRM (Open Source Routing Machine)
 * No API key required - public demo server
 */

// Get route between two points with distance and duration
export async function getRoute(originCoords, destCoords) {
  try {
    // originCoords and destCoords should be [lng, lat]
    const url = `https://router.project-osrm.org/route/v1/driving/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}`;
    
    const response = await axios.get(url, {
      params: {
        overview: 'full',
        geometries: 'geojson'
      }
    });

    if (!response.data.routes || response.data.routes.length === 0) {
      throw new Error('No route found');
    }

    const route = response.data.routes[0];

    return {
      distanceKm: (route.distance / 1000).toFixed(1), // meters to km
      durationMin: Math.round(route.duration / 60), // seconds to minutes
      geometry: route.geometry, // GeoJSON LineString for map display
      legs: route.legs
    };
  } catch (error) {
    console.error('Routing error:', error.message);
    throw new Error('Failed to calculate route');
  }
}

// Get multiple routes for optimization (e.g., donor → NGO with volunteer stops)
export async function getMultiStopRoute(coordinates) {
  try {
    // coordinates is array of [lng, lat] pairs
    const coordString = coordinates.map(c => `${c[0]},${c[1]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}`;
    
    const response = await axios.get(url, {
      params: {
        overview: 'full',
        geometries: 'geojson',
        steps: true
      }
    });

    if (!response.data.routes || response.data.routes.length === 0) {
      throw new Error('No route found');
    }

    const route = response.data.routes[0];

    return {
      totalDistanceKm: (route.distance / 1000).toFixed(1),
      totalDurationMin: Math.round(route.duration / 60),
      geometry: route.geometry,
      legs: route.legs.map(leg => ({
        distanceKm: (leg.distance / 1000).toFixed(1),
        durationMin: Math.round(leg.duration / 60),
        steps: leg.steps?.length || 0
      }))
    };
  } catch (error) {
    console.error('Multi-stop routing error:', error.message);
    throw new Error('Failed to calculate multi-stop route');
  }
}

// Calculate straight-line distance (fallback if routing fails)
export function calculateDistance(coord1, coord2) {
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const lat1 = coord1[1] * Math.PI / 180;
  const lat2 = coord2[1] * Math.PI / 180;
  const dLat = (coord2[1] - coord1[1]) * Math.PI / 180;
  const dLon = (coord2[0] - coord1[0]) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance.toFixed(1); // km
}
