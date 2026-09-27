import { MapsServer } from './servers/mapsServer.js';
import { WeatherServer } from './servers/weatherServer.js';
import { CalendarServer } from './servers/calendarServer.js';

/**
 * MCP Manager - Coordinates all MCP servers for ResQ-AI
 * Implements Model Context Protocol for external service integration
 */
class MCPManager {
  constructor() {
    this.servers = new Map();
    this.initialized = false;
  }

  /**
   * Initialize all MCP servers
   */
  async initialize() {
    try {
      console.log('🔧 Initializing MCP servers...');

      // Initialize Maps Server
      const mapsServer = new MapsServer();
      await mapsServer.initialize();
      this.servers.set('maps', mapsServer);

      // Initialize Weather Server
      const weatherServer = new WeatherServer();
      await weatherServer.initialize();
      this.servers.set('weather', weatherServer);

      // Initialize Calendar Server
      const calendarServer = new CalendarServer();
      await calendarServer.initialize();
      this.servers.set('calendar', calendarServer);

      this.initialized = true;
      console.log('✅ MCP servers initialized successfully');
      
      return {
        success: true,
        servers: Array.from(this.servers.keys()),
        tools: this.getAllTools()
      };
    } catch (error) {
      console.error('❌ MCP initialization failed:', error);
      throw error;
    }
  }

  /**
   * Execute a tool from a specific server
   */
  async executeTool(serverName, toolName, params = {}) {
    if (!this.initialized) {
      throw new Error('MCP servers not initialized');
    }

    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`MCP server '${serverName}' not found`);
    }

    return await server.executeTool(toolName, params);
  }

  /**
   * Get all available tools from all servers
   */
  getAllTools() {
    const tools = {};
    
    for (const [serverName, server] of this.servers) {
      tools[serverName] = server.getAvailableTools();
    }

    return tools;
  }

  /**
   * Get server status
   */
  getStatus() {
    const status = {
      initialized: this.initialized,
      servers: {}
    };

    for (const [serverName, server] of this.servers) {
      status.servers[serverName] = {
        status: server.getStatus(),
        tools: server.getAvailableTools().length
      };
    }

    return status;
  }

  /**
   * Health check for all servers
   */
  async healthCheck() {
    const results = {};

    for (const [serverName, server] of this.servers) {
      try {
        results[serverName] = await server.healthCheck();
      } catch (error) {
        results[serverName] = {
          healthy: false,
          error: error.message
        };
      }
    }

    return results;
  }
}

// Singleton instance
export const mcpManager = new MCPManager();

export default MCPManager;