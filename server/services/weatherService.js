import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Weather Service - OpenWeatherMap (FREE TIER)
 * Uses the API key from .env
 */

// Get current weather for coordinates
export async function getCurrentWeather(lat, lng) {
  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        lat: lat,
        lon: lng,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric' // Celsius
      }
    });

    const data = response.data;

    return {
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      condition: data.weather[0].main,
      description: data.weather[0].description,
      windSpeed: data.wind.speed,
      isSafeForDelivery: assessDeliverySafety(data)
    };
  } catch (error) {
    console.error('Weather API error:', error.message);
    throw new Error('Failed to fetch weather data');
  }
}

// Assess if weather is safe for food delivery
function assessDeliverySafety(weatherData) {
  const { main, weather } = weatherData;
  
  // Unsafe conditions
  if (main.temp > 35) return { safe: false, reason: 'Too hot - food safety risk' };
  if (main.temp < 0) return { safe: false, reason: 'Freezing conditions' };
  
  const condition = weather[0].main.toLowerCase();
  if (condition.includes('storm') || condition.includes('thunder')) {
    return { safe: false, reason: 'Severe weather - unsafe for delivery' };
  }
  if (condition.includes('rain') && main.temp > 30) {
    return { safe: true, reason: 'Rainy but manageable - ensure food is covered', caution: true };
  }
  
  return { safe: true, reason: 'Weather conditions are good for delivery' };
}

// Adjust shelf life based on weather (for matching engine)
export function adjustShelfLifeForWeather(baseHours, temperature) {
  if (temperature > 30) {
    // Reduce shelf life in hot weather
    const reduction = (temperature - 30) * 0.1; // 10% reduction per degree above 30°C
    return Math.max(1, baseHours * (1 - reduction));
  }
  
  if (temperature < 5) {
    // Extend shelf life in cold weather (like refrigeration)
    return baseHours * 1.5;
  }
  
  return baseHours; // Normal weather, no adjustment
}

// Get forecast for next 3 hours (useful for planning pickups)
export async function getShortTermForecast(lat, lng) {
  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: {
        lat: lat,
        lon: lng,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric',
        cnt: 1 // Next 3 hours only
      }
    });

    const forecast = response.data.list[0];
    
    return {
      time: new Date(forecast.dt * 1000),
      temperature: forecast.main.temp,
      condition: forecast.weather[0].main,
      description: forecast.weather[0].description
    };
  } catch (error) {
    console.error('Forecast API error:', error.message);
    return null; // Non-critical, can continue without forecast
  }
}
