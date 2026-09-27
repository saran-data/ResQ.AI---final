import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { mcpManager } from '../mcp/mcpManager.js';

const router = express.Router();

/**
 * @route   GET /api/mcp/status
 * @desc    Get MCP system status
 * @access  Private
 */
router.get('/status', verifyToken, async (req, res) => {
  try {
    const status = mcpManager.getStatus();
    res.json({
      success: true,
      ...status,
      message: 'MCP system status retrieved successfully'
    });
  } catch (error) {
    console.error('MCP status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get MCP status' 
    });
  }
});

/**
 * @route   GET /api/mcp/tools
 * @desc    Get all available MCP tools
 * @access  Private
 */
router.get('/tools', verifyToken, async (req, res) => {
  try {
    const tools = mcpManager.getAllTools();
    res.json({
      success: true,
      tools,
      message: 'MCP tools retrieved successfully'
    });
  } catch (error) {
    console.error('MCP tools error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get MCP tools' 
    });
  }
});

/**
 * @route   GET /api/mcp/health
 * @desc    MCP health check
 * @access  Private
 */
router.get('/health', verifyToken, async (req, res) => {
  try {
    const healthResults = await mcpManager.healthCheck();
    const allHealthy = Object.values(healthResults).every(result => result.healthy);
    
    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      health: healthResults,
      message: allHealthy ? 'All MCP servers healthy' : 'Some MCP servers unhealthy'
    });
  } catch (error) {
    console.error('MCP health check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Health check failed' 
    });
  }
});

/**
 * @route   POST /api/mcp/execute
 * @desc    Execute MCP tool
 * @access  Private
 */
router.post('/execute', verifyToken, async (req, res) => {
  try {
    const { server, tool, params = {} } = req.body;

    if (!server || !tool) {
      return res.status(400).json({
        success: false,
        error: 'Server and tool parameters are required'
      });
    }

    console.log(`🔧 Executing MCP tool: ${server}:${tool}`);
    const result = await mcpManager.executeTool(server, tool, params);

    res.json({
      success: result.success,
      result: result.result,
      server: result.server,
      tool: result.tool,
      error: result.error,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('MCP execution error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'MCP tool execution failed' 
    });
  }
});

/**
 * @route   POST /api/mcp/maps/distance
 * @desc    Calculate distance between locations
 * @access  Private
 */
router.post('/maps/distance', verifyToken, async (req, res) => {
  try {
    const { origin, destination } = req.body;
    
    const result = await mcpManager.executeTool('maps', 'calculateDistance', {
      origin,
      destination
    });

    res.json(result);
  } catch (error) {
    console.error('Maps distance error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Distance calculation failed' 
    });
  }
});

/**
 * @route   POST /api/mcp/maps/optimize
 * @desc    Optimize delivery route
 * @access  Private
 */
router.post('/maps/optimize', verifyToken, async (req, res) => {
  try {
    const { startLocation, destinations, vehicleType } = req.body;
    
    const result = await mcpManager.executeTool('maps', 'optimizeRoute', {
      startLocation,
      destinations,
      vehicleType
    });

    res.json(result);
  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Route optimization failed' 
    });
  }
});

/**
 * @route   POST /api/mcp/weather/current
 * @desc    Get current weather
 * @access  Private
 */
router.post('/weather/current', verifyToken, async (req, res) => {
  try {
    const { location, units } = req.body;
    
    const result = await mcpManager.executeTool('weather', 'getCurrentWeather', {
      location,
      units
    });

    res.json(result);
  } catch (error) {
    console.error('Weather lookup error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Weather lookup failed' 
    });
  }
});

/**
 * @route   POST /api/mcp/weather/delivery
 * @desc    Get delivery conditions assessment
 * @access  Private
 */
router.post('/weather/delivery', verifyToken, async (req, res) => {
  try {
    const { location, foodType } = req.body;
    
    const result = await mcpManager.executeTool('weather', 'getDeliveryConditions', {
      location,
      foodType
    });

    res.json(result);
  } catch (error) {
    console.error('Delivery conditions error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Delivery conditions assessment failed' 
    });
  }
});

/**
 * @route   POST /api/mcp/calendar/book
 * @desc    Book pickup slot
 * @access  Private
 */
router.post('/calendar/book', verifyToken, async (req, res) => {
  try {
    const { ngoId, volunteerId, donationId, scheduledTime, duration, notes } = req.body;
    
    const result = await mcpManager.executeTool('calendar', 'bookPickupSlot', {
      ngoId,
      volunteerId,
      donationId,
      scheduledTime,
      duration,
      notes
    });

    res.json(result);
  } catch (error) {
    console.error('Calendar booking error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Pickup booking failed' 
    });
  }
});

/**
 * @route   GET /api/mcp/calendar/slots/:date
 * @desc    Get available time slots
 * @access  Private
 */
router.get('/calendar/slots/:date', verifyToken, async (req, res) => {
  try {
    const { date } = req.params;
    const { volunteerId, duration } = req.query;
    
    const result = await mcpManager.executeTool('calendar', 'getAvailableSlots', {
      date,
      volunteerId,
      duration: duration ? parseInt(duration) : undefined
    });

    res.json(result);
  } catch (error) {
    console.error('Calendar slots error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get available slots' 
    });
  }
});

/**
 * @route   GET /api/mcp/calendar/schedule
 * @desc    Get pickup schedule
 * @access  Private
 */
router.get('/calendar/schedule', verifyToken, async (req, res) => {
  try {
    const { userId, startDate, endDate, status } = req.query;
    
    const result = await mcpManager.executeTool('calendar', 'getPickupSchedule', {
      userId,
      startDate,
      endDate,
      status
    });

    res.json(result);
  } catch (error) {
    console.error('Calendar schedule error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get pickup schedule' 
    });
  }
});

export default router;