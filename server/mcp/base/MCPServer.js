/**
 * Base MCP Server Class
 * Implements the Model Context Protocol interface
 */
export class MCPServer {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.tools = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the server
   * Override in subclasses
   */
  async initialize() {
    console.log(`Initializing ${this.name} server...`);
    this.initialized = true;
    return { success: true };
  }

  /**
   * Register a tool with the server
   */
  registerTool(name, description, handler, inputSchema = {}) {
    this.tools.set(name, {
      name,
      description,
      handler,
      inputSchema
    });
  }

  /**
   * Execute a tool
   */
  async executeTool(toolName, params = {}) {
    const tool = this.tools.get(toolName);
    
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found in ${this.name} server`);
    }

    try {
      console.log(`🔧 Executing ${this.name}:${toolName} with params:`, params);
      const result = await tool.handler(params);
      console.log(`✅ ${this.name}:${toolName} completed successfully`);
      return {
        success: true,
        result,
        server: this.name,
        tool: toolName
      };
    } catch (error) {
      console.error(`❌ ${this.name}:${toolName} failed:`, error);
      return {
        success: false,
        error: error.message,
        server: this.name,
        tool: toolName
      };
    }
  }

  /**
   * Get all available tools
   */
  getAvailableTools() {
    return Array.from(this.tools.entries()).map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      name: this.name,
      description: this.description,
      initialized: this.initialized,
      toolCount: this.tools.size
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      healthy: this.initialized,
      server: this.name,
      timestamp: new Date().toISOString()
    };
  }
}