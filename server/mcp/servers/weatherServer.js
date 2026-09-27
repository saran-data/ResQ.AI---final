import { MCPServer } from '../base/MCPServer.js';

/**
 * Weather MCP Server
 * Provides weather information for route planning and food safety
 */
export class WeatherServer extends MCPServer {
  constructor() {
    super('weather', 'Weather information service for ResQ-AI delivery optimization');
  }

  async initialize() {
    await super.initialize();

    // Register tools
    this.registerTool(
      'getCurrentWeather',
      'Get current weather conditions for a location',
      this.getCurrentWeather.bind(this),
      {
        location: { type: 'string', required: true, description: 'City or address' },
        units: { type: 'string', description: 'Temperature units (celsius, fahrenheit)' }
      }
    );

    this.registerTool(
      'getWeatherForecast',
      'Get weather forecast for route planning',
      this.getWeatherForecast.bind(this),
      {
        location: { type: 'string', required: true, description: 'City or address' },
        days: { type: 'number', description: 'Number of forecast days (1-5)' },
        units: { type: 'string', description: 'Temperature units (celsius, fahrenheit)' }
      }
    );

    this.registerTool(
      'getDeliveryConditions',
      'Assess weather conditions for food delivery',
      this.getDeliveryConditions.bind(this),
      {
        location: { type: 'string', required: true, description: 'Delivery location' },
        foodType: { type: 'string', description: 'Type of food being delivered' }
      }
    );

    this.registerTool(
      'getRouteWeather',
      'Get weather along delivery route',
      this.getRouteWeather.bind(this),
      {
        locations: { type: 'array', required: true, description: 'List of locations along route' }
      }
    );

    console.log('✅ Weather server initialized with delivery optimization tools');
  }

  /**
   * Get current weather for a location
   */
  async getCurrentWeather({ location, units = 'celsius' }) {
    try {
      // Mock weather data - in real implementation, use OpenWeatherMap API
      const weatherConditions = [
        'clear', 'partly_cloudy', 'cloudy', 'light_rain', 'heavy_rain', 'thunderstorm'
      ];
      
      const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
      const baseTemp = units === 'fahrenheit' ? 77 : 25; // 77°F = 25°C
      const tempVariation = (Math.random() - 0.5) * 20;
      
      const weather = {
        location,
        timestamp: new Date().toISOString(),
        condition,
        temperature: Math.round((baseTemp + tempVariation) * 10) / 10,
        units: units === 'fahrenheit' ? '°F' : '°C',
        humidity: Math.round(40 + Math.random() * 40), // 40-80%
        windSpeed: Math.round(Math.random() * 20), // 0-20 km/h
        windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
        pressure: Math.round(1000 + Math.random() * 50), // 1000-1050 hPa
        visibility: Math.round(5 + Math.random() * 10), // 5-15 km
        uvIndex: Math.floor(Math.random() * 11) // 0-10
      };

      return {
        ...weather,
        deliverySuitability: this.assessDeliverySuitability(weather),
        source: 'weather-api'
      };
    } catch (error) {
      throw new Error(`Weather lookup failed: ${error.message}`);
    }
  }

  /**
   * Get weather forecast
   */
  async getWeatherForecast({ location, days = 3, units = 'celsius' }) {
    try {
      const forecast = [];
      const baseTemp = units === 'fahrenheit' ? 77 : 25;

      for (let i = 0; i < Math.min(days, 5); i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        const dayWeather = {
          date: date.toISOString().split('T')[0],
          dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
          high: Math.round((baseTemp + (Math.random() - 0.5) * 15) * 10) / 10,
          low: Math.round((baseTemp - 5 + (Math.random() - 0.5) * 10) * 10) / 10,
          units: units === 'fahrenheit' ? '°F' : '°C',
          condition: ['clear', 'partly_cloudy', 'cloudy', 'light_rain'][Math.floor(Math.random() * 4)],
          precipitationChance: Math.round(Math.random() * 100),
          humidity: Math.round(40 + Math.random() * 40),
          windSpeed: Math.round(Math.random() * 25)
        };

        dayWeather.deliveryRecommendation = this.getDeliveryRecommendation(dayWeather);
        forecast.push(dayWeather);
      }

      return {
        location,
        forecastPeriod: `${days} days`,
        forecast,
        source: 'weather-forecast-api'
      };
    } catch (error) {
      throw new Error(`Weather forecast failed: ${error.message}`);
    }
  }

  /**
   * Assess weather conditions specifically for food delivery
   */
  async getDeliveryConditions({ location, foodType = 'general' }) {
    try {
      const currentWeather = await this.getCurrentWeather({ location });
      const assessment = this.assessDeliverySuitability(currentWeather, foodType);

      return {
        location,
        foodType,
        weather: currentWeather,
        assessment,
        recommendations: this.getDeliveryRecommendations(currentWeather, foodType),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Delivery conditions assessment failed: ${error.message}`);
    }
  }

  /**
   * Get weather conditions along a delivery route
   */
  async getRouteWeather({ locations }) {
    try {
      const routeWeather = [];

      for (const location of locations) {
        const weather = await this.getCurrentWeather({ location });
        routeWeather.push({
          location,
          ...weather,
          stopOrder: routeWeather.length + 1
        });
      }

      return {
        routeLength: locations.length,
        routeWeather,
        overallConditions: this.summarizeRouteConditions(routeWeather),
        routeRecommendations: this.getRouteRecommendations(routeWeather),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Route weather lookup failed: ${error.message}`);
    }
  }

  /**
   * Assess delivery suitability based on weather
   */
  assessDeliverySuitability(weather, foodType = 'general') {
    let score = 100;
    const issues = [];

    // Temperature considerations
    if (weather.temperature > 35 || weather.temperature < 5) {
      score -= 30;
      issues.push('Extreme temperature affects food safety');
    }

    // Precipitation
    if (weather.condition.includes('rain')) {
      score -= weather.condition.includes('heavy') ? 40 : 20;
      issues.push('Rain may affect delivery time and food quality');
    }

    if (weather.condition === 'thunderstorm') {
      score -= 60;
      issues.push('Thunderstorm poses safety risk for delivery');
    }

    // Wind conditions
    if (weather.windSpeed > 40) {
      score -= 25;
      issues.push('Strong winds may affect delivery safety');
    }

    // Humidity for certain food types
    if (foodType === 'dairy' && weather.humidity > 80) {
      score -= 15;
      issues.push('High humidity requires extra care for dairy products');
    }

    // Visibility
    if (weather.visibility < 5) {
      score -= 20;
      issues.push('Poor visibility affects delivery safety');
    }

    return {
      score: Math.max(0, score),
      rating: score > 80 ? 'excellent' : score > 60 ? 'good' : score > 40 ? 'fair' : 'poor',
      issues,
      suitable: score > 40
    };
  }

  /**
   * Get delivery recommendations based on weather
   */
  getDeliveryRecommendations(weather, foodType) {
    const recommendations = [];

    if (weather.temperature > 30) {
      recommendations.push('Use insulated containers for temperature-sensitive items');
      recommendations.push('Minimize delivery time to prevent food spoilage');
    }

    if (weather.condition.includes('rain')) {
      recommendations.push('Use waterproof packaging');
      recommendations.push('Allow extra time for delivery');
      recommendations.push('Exercise caution on wet roads');
    }

    if (weather.windSpeed > 30) {
      recommendations.push('Secure all packaging to prevent spills');
      recommendations.push('Drive carefully due to strong winds');
    }

    if (foodType === 'dairy' || foodType === 'frozen') {
      recommendations.push('Use appropriate refrigeration during transport');
      recommendations.push('Complete delivery as quickly as possible');
    }

    if (recommendations.length === 0) {
      recommendations.push('Conditions are good for delivery - proceed normally');
    }

    return recommendations;
  }

  /**
   * Get delivery recommendation for forecast day
   */
  getDeliveryRecommendation(dayWeather) {
    if (dayWeather.condition === 'clear' && dayWeather.precipitationChance < 20) {
      return 'Ideal delivery conditions';
    } else if (dayWeather.precipitationChance > 70 || dayWeather.condition.includes('rain')) {
      return 'Plan for weather delays';
    } else {
      return 'Acceptable delivery conditions with precautions';
    }
  }

  /**
   * Summarize weather conditions along route
   */
  summarizeRouteConditions(routeWeather) {
    const conditions = routeWeather.map(w => w.condition);
    const temps = routeWeather.map(w => w.temperature);
    const precipChances = routeWeather.map(w => w.precipitationChance || 0);

    return {
      dominantCondition: this.getMostFrequent(conditions),
      temperatureRange: {
        min: Math.min(...temps),
        max: Math.max(...temps)
      },
      maxPrecipitationChance: Math.max(...precipChances),
      overallSuitability: Math.min(...routeWeather.map(w => w.deliverySuitability.score))
    };
  }

  /**
   * Get recommendations for route based on weather
   */
  getRouteRecommendations(routeWeather) {
    const recommendations = [];
    const overallConditions = this.summarizeRouteConditions(routeWeather);

    if (overallConditions.maxPrecipitationChance > 60) {
      recommendations.push('High chance of rain along route - prepare accordingly');
    }

    if (overallConditions.temperatureRange.max - overallConditions.temperatureRange.min > 10) {
      recommendations.push('Significant temperature variation along route');
    }

    if (overallConditions.overallSuitability < 50) {
      recommendations.push('Consider rescheduling delivery due to poor weather conditions');
    }

    return recommendations;
  }

  /**
   * Utility function to find most frequent item in array
   */
  getMostFrequent(arr) {
    return arr.sort((a, b) =>
      arr.filter(v => v === a).length - arr.filter(v => v === b).length
    ).pop();
  }
}