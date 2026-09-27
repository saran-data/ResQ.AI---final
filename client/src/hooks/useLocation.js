import { useState, useCallback } from 'react';

/**
 * useLocation Hook - Capture user's location from browser
 * 
 * Returns:
 * - getCurrentLocation(): Promise that resolves with {lat, lng, accuracy}
 * - loading: boolean
 * - error: string | null
 * - location: {lat, lng} | null
 */
export function useLocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);

  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = 'Geolocation is not supported by your browser';
        setError(error);
        reject(error);
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          
          setLocation(coords);
          setLoading(false);
          resolve(coords);
        },
        (err) => {
          let errorMessage = 'Failed to get your location';
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your browser.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. Please check your device settings.';
              break;
            case err.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage = 'An unknown error occurred while getting location.';
          }
          
          setError(errorMessage);
          setLoading(false);
          reject(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }, []);

  return {
    getCurrentLocation,
    loading,
    error,
    location
  };
}

/**
 * useLocationTracking Hook - Track user's location in real-time
 * Useful for volunteer tracking during deliveries
 * 
 * Returns:
 * - startTracking(callback): Start tracking and call callback on each update
 * - stopTracking(): Stop tracking
 * - isTracking: boolean
 * - currentLocation: {lat, lng, accuracy} | null
 * - error: string | null
 */
export function useLocationTracking() {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);

  const startTracking = useCallback((onLocationUpdate) => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return false;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        
        setCurrentLocation(coords);
        setError(null);
        
        if (onLocationUpdate) {
          onLocationUpdate(coords);
        }
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    setWatchId(id);
    setIsTracking(true);
    return true;
  }, []);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsTracking(false);
    }
  }, [watchId]);

  return {
    startTracking,
    stopTracking,
    isTracking,
    currentLocation,
    error
  };
}
