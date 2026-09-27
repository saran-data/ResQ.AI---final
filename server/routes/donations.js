import express from 'express';
import Donation from '../models/Donation.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/donations
 * @desc    Create a new donation
 * @access  Private (Donor only)
 */
router.post('/', verifyToken, requireRole('donor'), async (req, res) => {
  try {
    const {
      foodType,
      foodName,
      quantity,
      unit,
      prepTime,
      storageTemp,
      location,
      dietaryInfo,
      contactPerson,
      contactPhone,
      pickupInstructions,
      urgencyLevel
    } = req.body;

    // Validation
    if (!foodType || !foodName || !quantity || !unit || !prepTime || !storageTemp || !location) {
      return res.status(400).json({
        error: 'Missing required fields: foodType, foodName, quantity, unit, prepTime, storageTemp, location'
      });
    }

    if (!location.lat || !location.lng || !location.address) {
      return res.status(400).json({
        error: 'Location must include lat, lng, and address'
      });
    }

    // Calculate shelf life based on food type and storage
    const shelfLifeHours = calculateShelfLife(foodType, storageTemp, new Date(prepTime));
    const estimatedShelfLifeEnd = new Date(Date.now() + shelfLifeHours * 60 * 60 * 1000);

    // Create donation
    const donation = new Donation({
      donorId: req.user._id,
      foodType,
      foodName,
      quantity: parseFloat(quantity),
      unit,
      prepTime: new Date(prepTime),
      storageTemp,
      location,
      estimatedShelfLifeEnd,
      dietaryInfo: dietaryInfo || {},
      contactPerson: contactPerson || req.user.name,
      contactPhone: contactPhone || req.user.phone,
      pickupInstructions,
      urgencyLevel: urgencyLevel || calculateUrgencyLevel(shelfLifeHours)
    });

    await donation.save();

    // Populate donor info for response
    await donation.populate('donorId', 'name phone location');

    res.status(201).json({
      message: 'Donation created successfully',
      donation
    });

  } catch (error) {
    console.error('Create donation error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: 'Failed to create donation' });
  }
});

/**
 * @route   GET /api/donations
 * @desc    Get donations (filtered by user role)
 * @access  Private
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, foodType, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build filter based on user role
    let filter = {};
    
    if (req.user.role === 'donor') {
      // Donors see only their own donations
      filter.donorId = req.user._id;
    } else if (req.user.role === 'ngo') {
      // NGOs see open donations and those matched to them
      // FIXED: Properly handle additional filters without overwriting $or
      const ngoFilter = {
        $or: [
          { status: 'open' },
          { status: 'matched', ngoId: req.user._id }
        ]
      };
      
      filter = ngoFilter;
      
      // Add foodType filter if provided (works with $or)
      if (foodType) {
        filter.foodType = foodType;
      }
      
      // Override status filter only if explicitly provided
      if (status) {
        delete filter.$or;
        filter.status = status;
      }
    } else if (req.user.role === 'volunteer') {
      // Volunteers see:
      // - ALL open donations (available for pickup)
      // - matched/picked_up/delivered ones assigned to them
      filter = {
        $or: [
          { status: 'open' },
          { volunteerId: req.user._id }
        ]
      };

      if (foodType) filter.foodType = foodType;
      if (status) {
        delete filter.$or;
        if (status === 'open') {
          filter.status = 'open';
        } else {
          filter.status = status;
          filter.volunteerId = req.user._id;
        }
      }
    } else if (req.user.role === 'admin') {
      // Admins see all donations
      // Add filters for admin
      if (status) filter.status = status;
      if (foodType) filter.foodType = foodType;
    }

    // Exclude expired donations for non-admins
    if (req.user.role !== 'admin') {
      filter.estimatedShelfLifeEnd = { $gt: new Date() };
    }
    
    console.log('🔍 Donations query filter:', JSON.stringify(filter), 'Role:', req.user.role);

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const donations = await Donation.find(filter)
      .populate('donorId', 'name phone location')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const total = await Donation.countDocuments(filter);
    
    console.log(`✅ Found ${donations.length} donations for role: ${req.user.role}`);

    res.json({
      donations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({ error: 'Failed to get donations' });
  }
});

/**
 * @route   GET /api/donations/:id
 * @desc    Get single donation
 * @access  Private
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('donorId', 'name phone location email');

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    // Check access permissions
    const isOwner = donation.donorId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const canViewOpen = req.user.role === 'ngo' && donation.status === 'open';
    
    if (!isOwner && !isAdmin && !canViewOpen) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ donation });

  } catch (error) {
    console.error('Get donation error:', error);
    res.status(500).json({ error: 'Failed to get donation' });
  }
});

/**
 * @route   PUT /api/donations/:id
 * @desc    Update donation
 * @access  Private (Owner or Admin)
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    // Check permissions
    const isOwner = donation.donorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Don't allow updates to matched/completed donations (unless admin)
    if (!isAdmin && ['matched', 'picked_up', 'delivered'].includes(donation.status)) {
      return res.status(400).json({ error: 'Cannot update donation in current status' });
    }

    // Remove fields that shouldn't be updated directly
    const updates = { ...req.body };
    delete updates.donorId;
    delete updates.createdAt;
    delete updates.updatedAt;

    // Recalculate shelf life if relevant fields are updated
    if (updates.prepTime || updates.foodType || updates.storageTemp) {
      const prepTime = updates.prepTime ? new Date(updates.prepTime) : donation.prepTime;
      const foodType = updates.foodType || donation.foodType;
      const storageTemp = updates.storageTemp || donation.storageTemp;
      
      const shelfLifeHours = calculateShelfLife(foodType, storageTemp, prepTime);
      updates.estimatedShelfLifeEnd = new Date(Date.now() + shelfLifeHours * 60 * 60 * 1000);
      updates.urgencyLevel = calculateUrgencyLevel(shelfLifeHours);
    }

    const updatedDonation = await Donation.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('donorId', 'name phone location');

    res.json({
      message: 'Donation updated successfully',
      donation: updatedDonation
    });

  } catch (error) {
    console.error('Update donation error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: 'Failed to update donation' });
  }
});

/**
 * @route   DELETE /api/donations/:id
 * @desc    Cancel/delete donation
 * @access  Private (Owner or Admin)
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    // Check permissions
    const isOwner = donation.donorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Don't allow deletion of active matches (unless admin)
    if (!isAdmin && ['picked_up', 'delivered'].includes(donation.status)) {
      return res.status(400).json({ error: 'Cannot delete donation in current status' });
    }

    // Soft delete - just mark as cancelled
    donation.status = 'cancelled';
    await donation.save();

    res.json({ message: 'Donation cancelled successfully' });

  } catch (error) {
    console.error('Delete donation error:', error);
    res.status(500).json({ error: 'Failed to delete donation' });
  }
});

/**
 * Calculate estimated shelf life based on food type and storage conditions
 */
function calculateShelfLife(foodType, storageTemp, prepTime) {
  // Base shelf life in hours for different food types and storage temperatures
  const shelfLifeMap = {
    'cooked': {
      'frozen': 72, // 3 days
      'refrigerated': 24, // 1 day
      'room_temp': 4 // 4 hours
    },
    'raw': {
      'frozen': 168, // 7 days
      'refrigerated': 48, // 2 days
      'room_temp': 8 // 8 hours
    },
    'packaged': {
      'frozen': 720, // 30 days
      'refrigerated': 240, // 10 days
      'room_temp': 120 // 5 days
    },
    'fruits': {
      'frozen': 240, // 10 days
      'refrigerated': 120, // 5 days
      'room_temp': 48 // 2 days
    },
    'vegetables': {
      'frozen': 240, // 10 days
      'refrigerated': 120, // 5 days
      'room_temp': 48 // 2 days
    },
    'dairy': {
      'frozen': 168, // 7 days
      'refrigerated': 72, // 3 days
      'room_temp': 2 // 2 hours
    },
    'grains': {
      'frozen': 720, // 30 days
      'refrigerated': 240, // 10 days
      'room_temp': 168 // 7 days
    },
    'other': {
      'frozen': 72, // 3 days
      'refrigerated': 24, // 1 day
      'room_temp': 8 // 8 hours
    }
  };

  const baseHours = shelfLifeMap[foodType]?.[storageTemp] || 4; // Default to 4 hours
  
  // Reduce shelf life based on time since preparation
  const hoursSincePrep = (Date.now() - prepTime.getTime()) / (1000 * 60 * 60);
  const remainingHours = Math.max(1, baseHours - hoursSincePrep);

  return remainingHours;
}

/**
 * Calculate urgency level based on remaining shelf life
 */
function calculateUrgencyLevel(shelfLifeHours) {
  if (shelfLifeHours <= 2) return 'critical';
  if (shelfLifeHours <= 6) return 'high';
  if (shelfLifeHours <= 24) return 'medium';
  return 'low';
}

/**
 * @route   POST /api/donations/:id/request
 * @desc    Request pickup for a donation (NGO matches with donation)
 * @access  Private (NGO only)
 */
router.post('/:id/request', verifyToken, requireRole('ngo'), async (req, res) => {
  try {
    const donationId = req.params.id;
    const ngoUserId = req.user._id;

    const donation = await Donation.findById(donationId)
      .populate('donorId', 'name email phone location');
      
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    // Check if donation is available (status should be 'open')
    if (donation.status !== 'open') {
      return res.status(400).json({ 
        error: `Donation is not available for pickup. Current status: ${donation.status}` 
      });
    }

    // Check if donation has expired
    if (new Date(donation.estimatedShelfLifeEnd) < new Date()) {
      return res.status(400).json({ error: 'Donation has expired' });
    }

    // Find NGO profile
    const NGO = (await import('../models/NGO.js')).default;
    const ngoProfile = await NGO.findOne({ userId: ngoUserId })
      .populate('userId', 'name email phone location');
      
    if (!ngoProfile) {
      return res.status(404).json({ error: 'NGO profile not found' });
    }

    // Update donation status to matched
    donation.status = 'matched';
    donation.ngoId = ngoProfile._id;
    donation.matchedAt = new Date();
    await donation.save();

    console.log(`✅ Donation ${donationId} matched with NGO ${ngoProfile.organizationName}`);

    // Assign volunteer and send notifications
    const { assignVolunteer } = await import('../services/volunteerService.js');
    const assignmentResult = await assignVolunteer(
      donation,
      donation.donorId,
      ngoProfile
    );

    if (!assignmentResult.success) {
      console.warn('⚠️ Volunteer assignment failed:', assignmentResult.error);
      // Don't fail the request - NGO match is still successful
    }

    res.json({
      success: true,
      message: assignmentResult.success
        ? `Pickup request submitted successfully! Volunteer ${assignmentResult.volunteer.name} has been assigned.`
        : 'Pickup request submitted successfully! A volunteer will be assigned shortly.',
      donation: {
        id: donation._id,
        foodType: donation.foodType,
        foodName: donation.foodName,
        quantity: donation.quantity,
        unit: donation.unit,
        status: donation.status,
        matchedAt: donation.matchedAt,
        volunteer: assignmentResult.success ? {
          name: assignmentResult.volunteer.name,
          phone: assignmentResult.volunteer.phone,
          distance: assignmentResult.volunteer.distance
        } : null,
        route: assignmentResult.success ? assignmentResult.route : null,
        donor: {
          name: donation.donorId.name,
          phone: donation.donorId.phone,
          location: donation.donorId.location
        }
      }
    });

  } catch (error) {
    console.error('❌ Request pickup error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to request pickup. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/donations/:id/accept
 * @desc    Volunteer accepts/claims an open donation for pickup
 * @access  Private (Volunteer only)
 */
router.post('/:id/accept', verifyToken, requireRole('volunteer'), async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id).populate('donorId', 'name phone location email');

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    if (donation.status !== 'open') {
      return res.status(400).json({ error: `Donation is not available for pickup. Current status: ${donation.status}` });
    }

    if (new Date(donation.estimatedShelfLifeEnd) < new Date()) {
      return res.status(400).json({ error: 'Donation has expired' });
    }

    donation.volunteerId = req.user._id;
    donation.status = 'matched';
    donation.matchedAt = new Date();
    await donation.save();
    await donation.populate('donorId', 'name phone location');

    console.log(`✅ Volunteer ${req.user.name} accepted donation ${donation._id}`);

    res.json({
      success: true,
      message: 'Pickup accepted! Head to the pickup location.',
      donation
    });
  } catch (error) {
    console.error('Accept donation error:', error);
    res.status(500).json({ error: 'Failed to accept pickup' });
  }
});

/**
 * @route   POST /api/donations/:id/pickup
 * @desc    Volunteer marks donation as physically picked up
 * @access  Private (Volunteer assigned to this donation)
 */
router.post('/:id/pickup', verifyToken, requireRole('volunteer'), async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    if (!donation.volunteerId || donation.volunteerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not assigned to this donation' });
    }

    if (donation.status !== 'matched') {
      return res.status(400).json({ error: `Cannot mark as picked up. Current status: ${donation.status}` });
    }

    donation.status = 'picked_up';
    donation.pickedUpAt = new Date();
    await donation.save();
    await donation.populate('donorId', 'name phone location');

    console.log(`✅ Volunteer ${req.user.name} picked up donation ${donation._id}`);

    res.json({
      success: true,
      message: 'Marked as picked up! Now deliver to the NGO.',
      donation
    });
  } catch (error) {
    console.error('Pickup donation error:', error);
    res.status(500).json({ error: 'Failed to mark as picked up' });
  }
});

/**
 * @route   POST /api/donations/:id/deliver
 * @desc    Volunteer marks donation as delivered to NGO
 * @access  Private (Volunteer assigned to this donation)
 */
router.post('/:id/deliver', verifyToken, requireRole('volunteer'), async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    if (!donation.volunteerId || donation.volunteerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not assigned to this donation' });
    }

    if (!['matched', 'picked_up'].includes(donation.status)) {
      return res.status(400).json({ error: `Cannot mark as delivered. Current status: ${donation.status}` });
    }

    donation.status = 'delivered';
    donation.deliveredAt = new Date();
    await donation.save();
    await donation.populate('donorId', 'name phone location');

    console.log(`✅ Volunteer ${req.user.name} delivered donation ${donation._id}`);

    res.json({
      success: true,
      message: '🎉 Delivery complete! Thank you for your service.',
      donation
    });
  } catch (error) {
    console.error('Deliver donation error:', error);
    res.status(500).json({ error: 'Failed to mark as delivered' });
  }
});

export default router;