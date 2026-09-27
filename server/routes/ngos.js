import express from 'express';
import User from '../models/User.js';
import NGO from '../models/NGO.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { searchNearbyNGOs, getNGOById } from '../services/ngoSearchService.js';

const router = express.Router();

/**
 * @route   GET /api/ngos
 * @desc    Get all NGOs
 * @access  Private
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { 
      verified = null, 
      city = null, 
      dietaryNeeds = null,
      page = 1, 
      limit = 20 
    } = req.query;

    // Build filter
    let filter = {};
    
    if (verified !== null) {
      filter.verificationStatus = verified === 'true' ? 'verified' : 'pending';
    }

    // Build user filter for location
    let userFilter = { role: 'ngo', isActive: true };
    
    if (city) {
      userFilter['location.address'] = { $regex: city, $options: 'i' };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // First get NGO users
    const ngoUsers = await User.find(userFilter)
      .select('name email phone location organizationName')
      .skip(skip)
      .limit(limitNum);

    // Get corresponding NGO profiles
    const ngoIds = ngoUsers.map(user => user._id);
    const ngoProfiles = await NGO.find({ 
      userId: { $in: ngoIds },
      ...filter 
    }).populate('userId', 'name email phone location organizationName');

    // Filter by dietary needs if specified
    let filteredNGOs = ngoProfiles;
    if (dietaryNeeds) {
      const needsArray = dietaryNeeds.split(',');
      filteredNGOs = ngoProfiles.filter(ngo => 
        needsArray.some(need => 
          ngo.dietaryNeeds.includes(need) || ngo.dietaryNeeds.includes('any')
        )
      );
    }

    const total = await NGO.countDocuments({ 
      userId: { $in: ngoIds },
      ...filter 
    });

    res.json({
      ngos: filteredNGOs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get NGOs error:', error);
    res.status(500).json({ error: 'Failed to get NGOs' });
  }
});

/**
 * @route   POST /api/ngos/search
 * @desc    Search NGOs near a location with AI recommendations
 * @access  Private
 */
router.post('/search', verifyToken, async (req, res) => {
  try {
    const { 
      lat, 
      lng, 
      address, 
      maxDistance = 20,
      foodType,
      quantity,
      dietary
    } = req.body;

    // Validation
    if (!lat || !lng || !address) {
      return res.status(400).json({ 
        error: 'Missing required fields: lat, lng, address' 
      });
    }

    console.log(`🔍 AI-Powered NGO Search from ${address}`);

    const searchResults = await searchNearbyNGOs({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      address,
      maxDistance: parseInt(maxDistance),
      foodType,
      quantity: parseInt(quantity),
      dietary
    });

    res.json(searchResults);

  } catch (error) {
    console.error('NGO search error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to search NGOs',
      details: error.message 
    });
  }
});

/**
 * @route   GET /api/ngos/:id
 * @desc    Get single NGO profile
 * @access  Private
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const ngo = await NGO.findOne({ userId: req.params.id })
      .populate('userId', 'name email phone location organizationName createdAt');

    if (!ngo) {
      return res.status(404).json({ error: 'NGO not found' });
    }

    res.json({ ngo });

  } catch (error) {
    console.error('Get NGO error:', error);
    res.status(500).json({ error: 'Failed to get NGO' });
  }
});

/**
 * @route   PUT /api/ngos/profile
 * @desc    Update NGO profile
 * @access  Private (NGO only)
 */
router.put('/profile', verifyToken, requireRole('ngo'), async (req, res) => {
  try {
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates.userId;
    delete updates.verificationStatus;
    delete updates.rating;
    delete updates.stats;

    const ngo = await NGO.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('userId', 'name email phone location');

    if (!ngo) {
      return res.status(404).json({ error: 'NGO profile not found' });
    }

    res.json({
      message: 'NGO profile updated successfully',
      ngo
    });

  } catch (error) {
    console.error('Update NGO profile error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: 'Failed to update NGO profile' });
  }
});

/**
 * @route   PUT /api/ngos/:id/verify
 * @desc    Verify/reject NGO
 * @access  Private (Admin only)
 */
router.put('/:id/verify', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { status, reason } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "verified" or "rejected"' });
    }

    const ngo = await NGO.findOneAndUpdate(
      { userId: req.params.id },
      { 
        $set: { 
          verificationStatus: status,
          ...(reason && { verificationReason: reason })
        }
      },
      { new: true }
    ).populate('userId', 'name email organizationName');

    if (!ngo) {
      return res.status(404).json({ error: 'NGO not found' });
    }

    res.json({
      message: `NGO ${status} successfully`,
      ngo
    });

  } catch (error) {
    console.error('Verify NGO error:', error);
    res.status(500).json({ error: 'Failed to verify NGO' });
  }
});

/**
 * @route   POST /api/ngos/:id/rate
 * @desc    Rate an NGO
 * @access  Private (Donor/Volunteer only)
 */
router.post('/:id/rate', verifyToken, requireRole(['donor', 'volunteer']), async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const ngo = await NGO.findOne({ userId: req.params.id });

    if (!ngo) {
      return res.status(404).json({ error: 'NGO not found' });
    }

    // Calculate new average rating
    const currentTotal = ngo.rating.average * ngo.rating.count;
    const newCount = ngo.rating.count + 1;
    const newAverage = (currentTotal + rating) / newCount;

    ngo.rating.average = Math.round(newAverage * 10) / 10; // Round to 1 decimal
    ngo.rating.count = newCount;

    await ngo.save();

    // TODO: Store individual ratings in a separate collection for audit trail

    res.json({
      message: 'Rating submitted successfully',
      newRating: {
        average: ngo.rating.average,
        count: ngo.rating.count
      }
    });

  } catch (error) {
    console.error('Rate NGO error:', error);
    res.status(500).json({ error: 'Failed to rate NGO' });
  }
});

/**
 * @route   GET /api/ngos/nearby/:lat/:lng
 * @desc    Get nearby NGOs within specified radius
 * @access  Private
 */
router.get('/nearby/:lat/:lng', verifyToken, async (req, res) => {
  try {
    const { lat, lng } = req.params;
    const { radius = 10, limit = 20 } = req.query; // radius in km

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // Find nearby NGO users using geospatial query
    const nearbyUsers = await User.find({
      role: 'ngo',
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      }
    }).limit(parseInt(limit));

    // Get corresponding NGO profiles
    const userIds = nearbyUsers.map(user => user._id);
    const ngoProfiles = await NGO.find({
      userId: { $in: userIds },
      verificationStatus: 'verified'
    }).populate('userId', 'name email phone location organizationName');

    // Calculate distances and add to response
    const ngosWithDistance = ngoProfiles.map(ngo => {
      const distance = calculateDistance(
        latitude, 
        longitude, 
        ngo.userId.location.lat, 
        ngo.userId.location.lng
      );

      return {
        ...ngo.toObject(),
        distance: Math.round(distance * 10) / 10 // Round to 1 decimal
      };
    }).sort((a, b) => a.distance - b.distance);

    res.json({
      ngos: ngosWithDistance,
      center: { lat: latitude, lng: longitude },
      radius: parseInt(radius)
    });

  } catch (error) {
    console.error('Get nearby NGOs error:', error);
    res.status(500).json({ error: 'Failed to get nearby NGOs' });
  }
});

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in kilometers
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export default router;