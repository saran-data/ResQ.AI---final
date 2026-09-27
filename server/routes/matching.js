import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import MatchingService from '../services/matchingService.js';
import Donation from '../models/Donation.js';

const router = express.Router();

/**
 * @route   POST /api/matching/:donationId
 * @desc    Find matching NGOs for a donation
 * @access  Private
 */
router.post('/:donationId', verifyToken, async (req, res) => {
  try {
    const { donationId } = req.params;
    const { topN = 5 } = req.body;

    // Verify donation exists and user has access
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        error: 'Donation not found'
      });
    }

    // Check if user owns the donation or is admin
    const isOwner = donation.donorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Find matches
    const result = await MatchingService.findTopMatches(donationId, topN);
    
    if (result.success) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Matching endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Matching system temporarily unavailable'
    });
  }
});

/**
 * @route   POST /api/matching/:donationId/recommend
 * @desc    Get single best recommendation
 * @access  Private
 */
router.post('/:donationId/recommend', verifyToken, async (req, res) => {
  try {
    const { donationId } = req.params;

    const result = await MatchingService.getTopRecommendation(donationId);
    
    if (result.success) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({
      success: false,
      error: 'Recommendation system unavailable'
    });
  }
});

/**
 * @route   POST /api/matching/:donationId/:ngoId/create
 * @desc    Create a match between donation and NGO
 * @access  Private
 */
router.post('/:donationId/:ngoId/create', verifyToken, async (req, res) => {
  try {
    const { donationId, ngoId } = req.params;
    const matchData = req.body;

    const result = await MatchingService.createMatch(donationId, ngoId, matchData);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Create match error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create match'
    });
  }
});

export default router;