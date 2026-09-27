import User from '../models/User.js';
import NGO from '../models/NGO.js';
import Match from '../models/Match.js';
import Donation from '../models/Donation.js';

/**
 * AI-Powered Matching Engine
 * 
 * Uses weighted multi-criteria scoring algorithm:
 * - Distance: 40% (closer is better)
 * - Capacity: 30% (NGO availability vs donation size)  
 * - Dietary Match: 20% (compatibility with NGO dietary requirements)
 * - Shelf Life Urgency: 10% (more urgent = higher priority)
 * 
 * Transparent, explainable algorithm suitable for capstone defense
 */

class MatchingService {
  /**
   * Find best NGO matches for a donation
   */
  static async findTopMatches(donationId, topN = 5) {
    try {
      // Get donation with donor info
      const donation = await Donation.findById(donationId).populate('donorId');
      if (!donation) {
        throw new Error('Donation not found');
      }

      // Get all verified NGOs with their profiles
      const ngoUsers = await User.find({ 
        role: 'ngo', 
        isActive: true 
      }).select('name location');

      const ngoProfiles = await NGO.find({ 
        verificationStatus: 'verified',
        userId: { $in: ngoUsers.map(u => u._id) }
      }).populate('userId', 'name location');

      if (ngoProfiles.length === 0) {
        return {
          success: true,
          matches: [],
          message: 'No verified NGOs available for matching'
        };
      }

      // Calculate scores for each NGO
      const scoredMatches = await Promise.all(
        ngoProfiles.map(ngo => this.calculateMatch(donation, ngo))
      );

      // Sort by total score (highest first)
      scoredMatches.sort((a, b) => b.score.total - a.score.total);

      // Take top N matches
      const topMatches = scoredMatches.slice(0, topN);

      return {
        success: true,
        donation: {
          id: donation._id,
          foodName: donation.foodName,
          location: donation.location
        },
        matches: topMatches,
        algorithm: 'weighted-multi-criteria',
        weights: {
          distance: 40,
          capacity: 30,
          dietary: 20,
          shelfLife: 10
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Matching error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate match score between donation and NGO
   */
  static async calculateMatch(donation, ngo) {
    const weights = {
      distance: 0.4,    // 40%
      capacity: 0.3,    // 30%
      dietary: 0.2,     // 20%
      shelfLife: 0.1    // 10%
    };

    // 1. Distance Score (0-100, higher = closer)
    const distanceKm = this.calculateDistance(
      donation.location.lat,
      donation.location.lng,
      ngo.userId.location.lat,
      ngo.userId.location.lng
    );

    const distanceScore = this.normalizeDistanceScore(distanceKm);

    // 2. Capacity Score (0-100, higher = better fit)
    const capacityScore = this.calculateCapacityScore(donation, ngo);

    // 3. Dietary Match Score (0-100, higher = better match)
    const dietaryScore = this.calculateDietaryScore(donation, ngo);

    // 4. Shelf Life Urgency Score (0-100, higher = more urgent)
    const shelfLifeScore = this.calculateShelfLifeScore(donation);

    // Calculate weighted total score
    const totalScore = Math.round(
      (distanceScore * weights.distance) +
      (capacityScore * weights.capacity) +
      (dietaryScore * weights.dietary) +
      (shelfLifeScore * weights.shelfLife)
    );

    return {
      ngoId: ngo.userId._id,
      ngoName: ngo.organizationName,
      location: ngo.userId.location,
      distanceKm: Math.round(distanceKm * 10) / 10, // Round to 1 decimal
      score: {
        total: totalScore,
        breakdown: {
          distance: Math.round(distanceScore),
          capacity: Math.round(capacityScore),
          dietary: Math.round(dietaryScore),
          shelfLife: Math.round(shelfLifeScore)
        }
      },
      capacity: {
        daily: ngo.capacity.daily,
        current: ngo.capacity.current,
        available: ngo.capacity.daily - ngo.capacity.current
      },
      dietaryNeeds: ngo.dietaryNeeds,
      rating: ngo.rating ? ngo.rating.average : 0,
      isRecommended: totalScore >= 70, // Threshold for recommendation
      estimatedPickupTime: this.estimatePickupTime(distanceKm, donation.urgencyLevel)
    };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  }

  static deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  /**
   * Normalize distance to 0-100 score (closer = higher score)
   */
  static normalizeDistanceScore(distanceKm) {
    // Score decreases as distance increases
    // 0-2km = 100 points, 2-5km = 80-60 points, 5-10km = 60-30 points, >10km = <30 points
    if (distanceKm <= 2) return 100;
    if (distanceKm <= 5) return 100 - ((distanceKm - 2) / 3) * 40; // 100 to 60
    if (distanceKm <= 10) return 60 - ((distanceKm - 5) / 5) * 30; // 60 to 30
    return Math.max(10, 30 - ((distanceKm - 10) / 10) * 20); // 30 to 10
  }

  /**
   * Calculate capacity match score
   */
  static calculateCapacityScore(donation, ngo) {
    const available = ngo.capacity.daily - ngo.capacity.current;
    
    if (available <= 0) return 0; // No capacity
    
    // Estimate portions from donation
    const estimatedPortions = this.estimatePortions(donation);
    
    if (estimatedPortions > available) {
      // Donation too large - score based on how much over capacity
      const overCapacity = estimatedPortions / available;
      if (overCapacity > 3) return 10; // Way too large
      return 50 - (overCapacity - 1) * 20; // Gradually decrease
    }
    
    // Good fit - score based on capacity utilization
    const utilization = estimatedPortions / available;
    if (utilization >= 0.7) return 100; // Great utilization
    if (utilization >= 0.3) return 80 + (utilization - 0.3) * 50; // Good utilization
    return 50 + utilization * 100; // Lower utilization
  }

  /**
   * Calculate dietary compatibility score
   */
  static calculateDietaryScore(donation, ngo) {
    const ngoNeeds = ngo.dietaryNeeds || ['any'];
    const donationDietary = donation.dietaryInfo || {};
    
    // If NGO accepts 'any', full compatibility
    if (ngoNeeds.includes('any')) return 100;
    
    let matchCount = 0;
    let totalChecks = 0;
    
    // Check each dietary requirement
    const dietaryChecks = {
      vegetarian: donationDietary.isVegetarian,
      vegan: donationDietary.isVegan,
      halal: donationDietary.isHalal,
      kosher: donationDietary.isKosher,
      'gluten-free': donationDietary.isGlutenFree
    };
    
    for (const [requirement, donationHasIt] of Object.entries(dietaryChecks)) {
      if (ngoNeeds.includes(requirement)) {
        totalChecks++;
        if (donationHasIt) matchCount++;
      }
    }
    
    if (totalChecks === 0) return 100; // No specific requirements
    return (matchCount / totalChecks) * 100;
  }

  /**
   * Calculate shelf life urgency score
   */
  static calculateShelfLifeScore(donation) {
    const now = new Date();
    const expiryTime = new Date(donation.estimatedShelfLifeEnd);
    const hoursRemaining = (expiryTime - now) / (1000 * 60 * 60);
    
    // More urgent = higher score
    if (hoursRemaining <= 2) return 100; // Critical
    if (hoursRemaining <= 6) return 80;  // High
    if (hoursRemaining <= 24) return 60; // Medium
    return 40; // Low urgency
  }

  /**
   * Estimate portions from donation
   */
  static estimatePortions(donation) {
    const conversionFactors = {
      kg: 4,       // 1kg ≈ 4 portions
      grams: 0.004, // 1g ≈ 0.004 portions (250g per portion)
      liters: 4,   // 1L ≈ 4 portions
      pieces: 1,   // 1 piece = 1 portion
      portions: 1  // Direct mapping
    };
    
    const factor = conversionFactors[donation.unit] || 1;
    return Math.ceil(donation.quantity * factor);
  }

  /**
   * Estimate pickup time based on distance and urgency
   */
  static estimatePickupTime(distanceKm, urgencyLevel) {
    const baseTime = Math.ceil(distanceKm / 30 * 60); // Assume 30km/h avg speed
    const urgencyMultiplier = {
      critical: 0.5,
      high: 0.7,
      medium: 1.0,
      low: 1.5
    };
    
    const multiplier = urgencyMultiplier[urgencyLevel] || 1.0;
    return Math.max(15, Math.ceil(baseTime * multiplier)); // Minimum 15 minutes
  }

  /**
   * Get single best recommendation
   */
  static async getTopRecommendation(donationId) {
    const result = await this.findTopMatches(donationId, 1);
    
    if (result.success && result.matches.length > 0) {
      return {
        success: true,
        recommendation: result.matches[0]
      };
    }
    
    return {
      success: false,
      error: 'No suitable NGOs found'
    };
  }

  /**
   * Create a match record in database
   */
  static async createMatch(donationId, ngoId, matchData) {
    try {
      const match = new Match({
        donationId,
        ngoId,
        score: matchData.score,
        distanceKm: matchData.distanceKm,
        status: 'pending'
      });

      await match.save();

      return {
        success: true,
        matchId: match._id
      };

    } catch (error) {
      console.error('Create match error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default MatchingService;