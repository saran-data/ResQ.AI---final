import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import ragService from '../services/ragService.js';
import geminiService from '../services/geminiService.js';

const router = express.Router();

/**
 * @route   POST /api/chat
 * @desc    Query RAG safety assistant
 * @access  Private
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (question.trim().length < 3) {
      return res.status(400).json({ error: 'Question too short - please provide more details' });
    }

    // Query RAG service
    const result = await ragService.query(question);

    if (result.success) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'RAG query failed'
      });
    }

  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({
      success: false, 
      error: 'Chat system temporarily unavailable'
    });
  }
});

/**
 * @route   POST /api/chat/assess/:donationId
 * @desc    Assess donation safety using RAG
 * @access  Private
 */
router.post('/assess/:donationId', verifyToken, async (req, res) => {
  try {
    const { donationId } = req.params;
    
    // Get donation data (you would fetch from DB)
    // For now, use request body
    const donationData = req.body;

    if (!donationData) {
      return res.status(400).json({ error: 'Donation data required' });
    }

    const assessment = await ragService.assessDonationSafety({
      ...donationData,
      _id: donationId
    });

    res.json({
      success: assessment.success,
      data: assessment
    });

  } catch (error) {
    console.error('Assessment error:', error);
    res.status(500).json({
      success: false,
      error: 'Safety assessment failed'
    });
  }
});

/**
 * @route   GET /api/chat/health
 * @desc    Check RAG system health
 * @access  Private
 */
router.get('/health', verifyToken, async (req, res) => {
  try {
    const health = {
      ragService: ragService.initialized,
      geminiService: geminiService.isAvailable(),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      health
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

export default router;