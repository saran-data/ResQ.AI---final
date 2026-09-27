import NGO from '../models/NGO.js';
import geminiService from './geminiService.js';

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100;
}

/**
 * Search NGOs near a location with AI-powered recommendations
 * @param {Object} params - Search parameters
 * @param {number} params.lat - User latitude
 * @param {number} params.lng - User longitude
 * @param {string} params.address - User address
 * @param {number} params.maxDistance - Maximum distance in km (default: 20)
 * @param {string} params.foodType - Type of food being donated
 * @param {number} params.quantity - Quantity of food
 * @param {Object} params.dietary - Dietary info
 * @returns {Object} Search results with AI recommendations
 */
export async function searchNearbyNGOs({ 
  lat, 
  lng, 
  address, 
  maxDistance = 20,
  foodType = null,
  quantity = null,
  dietary = {}
}) {
  try {
    console.log(`🔍 Searching NGOs near ${address} (${lat}, ${lng})`);

    // 1. Fetch all NGOs with user data
    const allNGOs = await NGO.find({ 
      verificationStatus: 'verified' 
    }).populate('userId', 'name email phone location');

    if (allNGOs.length === 0) {
      return {
        success: true,
        ngos: [],
        aiRecommendation: 'No verified NGOs found in the database. Please check back later.',
        totalFound: 0
      };
    }

    console.log(`✅ Found ${allNGOs.length} verified NGOs in database`);

    // 2. Calculate distances and filter by max distance
    const ngosWithDistance = allNGOs
      .map(ngo => {
        const ngoLat = ngo.userId?.location?.lat || 13.0850;
        const ngoLng = ngo.userId?.location?.lng || 80.2101;
        
        const distance = calculateDistance(
          { lat, lng },
          { lat: ngoLat, lng: ngoLng }
        );

        return {
          ngo,
          distance,
          matchScore: calculateMatchScore(ngo, { foodType, quantity, dietary, distance })
        };
      })
      .filter(item => item.distance <= maxDistance)
      .sort((a, b) => b.matchScore - a.matchScore); // Sort by match score

    console.log(`✅ ${ngosWithDistance.length} NGOs within ${maxDistance}km`);

    if (ngosWithDistance.length === 0) {
      return {
        success: true,
        ngos: [],
        aiRecommendation: `No NGOs found within ${maxDistance}km of your location. Try expanding the search radius.`,
        totalFound: 0
      };
    }

    // 3. Get AI recommendations using RAG
    let aiRecommendation = '';
    let aiAnalysis = {};

    try {
      const ngoContext = ngosWithDistance.slice(0, 5).map((item, index) => ({
        rank: index + 1,
        name: item.ngo.organizationName,
        distance: item.distance,
        capacity: item.ngo.capacity.daily,
        servingAreas: item.ngo.servingAreas,
        matchScore: item.matchScore,
        location: item.ngo.userId.location.address
      }));

      const aiQuery = `
I'm a food donor in ${address} looking to donate ${quantity || 'some'} ${foodType || 'food'}.
${dietary.isVegetarian ? 'The food is vegetarian.' : ''}
${dietary.isVegan ? 'The food is vegan.' : ''}
${dietary.isHalal ? 'The food is halal.' : ''}

Here are the top 5 nearest verified NGOs:
${JSON.stringify(ngoContext, null, 2)}

Based on food safety guidelines, proximity, capacity, and serving areas:
1. Which NGO would you recommend as the BEST match and why?
2. Provide a brief recommendation (2-3 sentences) for the donor.
3. Any food safety considerations for this donation?

Keep the response concise and actionable.
      `.trim();

      console.log('🤖 Querying Gemini AI for recommendations...');
      
      let aiAnswer;
      if (geminiService.isAvailable()) {
        aiAnswer = await geminiService.generateText(aiQuery);
      } else {
        throw new Error('Gemini not available');
      }
      aiRecommendation = aiAnswer || 'AI recommendation unavailable.';
      
      // Parse AI response to extract structured data
      aiAnalysis = {
        topRecommendation: ngoContext[0],
        reasoning: aiRecommendation,
        safetyNotes: extractSafetyNotes(aiRecommendation)
      };

      console.log('✅ AI recommendation generated');

    } catch (error) {
      console.error('⚠️ AI recommendation failed:', error.message);
      aiRecommendation = `Based on proximity and capacity, we recommend ${ngosWithDistance[0].ngo.organizationName} (${ngosWithDistance[0].distance}km away).`;
    }

    // 4. Format response
    const formattedNGOs = ngosWithDistance.map(item => ({
      id: item.ngo._id,
      name: item.ngo.organizationName,
      registrationNumber: item.ngo.registrationNumber,
      distance: item.distance,
      matchScore: item.matchScore,
      capacity: {
        daily: item.ngo.capacity.daily,
        current: item.ngo.capacity.current,
        available: item.ngo.capacity.daily - item.ngo.capacity.current
      },
      servingAreas: item.ngo.servingAreas,
      location: {
        lat: item.ngo.userId.location.lat,
        lng: item.ngo.userId.location.lng,
        address: item.ngo.userId.location.address
      },
      primaryContact: item.ngo.primaryContact,
      verificationStatus: item.ngo.verificationStatus,
      rating: item.ngo.rating?.average || 4.5,
      tags: generateTags(item.ngo, item.distance)
    }));

    return {
      success: true,
      ngos: formattedNGOs,
      aiRecommendation,
      aiAnalysis,
      totalFound: formattedNGOs.length,
      searchParams: {
        location: address,
        maxDistance,
        foodType,
        quantity
      }
    };

  } catch (error) {
    console.error('❌ NGO search error:', error);
    return {
      success: false,
      error: error.message || 'Failed to search NGOs',
      ngos: []
    };
  }
}

/**
 * Calculate match score between NGO and donation
 */
function calculateMatchScore(ngo, donation) {
  let score = 100;

  // Distance factor (closer = higher score)
  if (donation.distance <= 2) score += 40;
  else if (donation.distance <= 5) score += 25;
  else if (donation.distance <= 10) score += 10;
  else if (donation.distance > 15) score -= 20;

  // Capacity factor
  const availableCapacity = ngo.capacity.daily - ngo.capacity.current;
  if (availableCapacity >= 100) score += 20;
  else if (availableCapacity >= 50) score += 10;
  else if (availableCapacity < 20) score -= 10;

  // Dietary compatibility
  if (donation.dietary?.isVegetarian && ngo.dietaryNeeds?.includes('vegetarian')) {
    score += 15;
  }
  if (donation.dietary?.isVegan && ngo.dietaryNeeds?.includes('vegan')) {
    score += 15;
  }
  if (donation.dietary?.isHalal && ngo.dietaryNeeds?.includes('halal')) {
    score += 15;
  }

  // Verification status
  if (ngo.verificationStatus === 'verified') score += 20;
  else if (ngo.verificationStatus === 'pending') score -= 10;

  return Math.max(0, Math.min(100, score)); // Clamp between 0-100
}

/**
 * Generate descriptive tags for NGO
 */
function generateTags(ngo, distance) {
  const tags = [];
  
  if (distance <= 2) tags.push('Very Close');
  else if (distance <= 5) tags.push('Nearby');
  
  if (ngo.capacity.daily >= 500) tags.push('Large Capacity');
  else if (ngo.capacity.daily >= 200) tags.push('Medium Capacity');
  
  if (ngo.verificationStatus === 'verified') tags.push('Verified');
  
  const availableCapacity = ngo.capacity.daily - ngo.capacity.current;
  if (availableCapacity >= 100) tags.push('High Availability');
  
  if (ngo.servingAreas?.length > 3) tags.push('Wide Coverage');
  
  return tags;
}

/**
 * Extract safety notes from AI response
 */
function extractSafetyNotes(aiText) {
  const lowerText = aiText.toLowerCase();
  const notes = [];
  
  if (lowerText.includes('refrigerat')) notes.push('Ensure proper refrigeration');
  if (lowerText.includes('temperature')) notes.push('Monitor temperature during transport');
  if (lowerText.includes('expir')) notes.push('Check expiry times carefully');
  if (lowerText.includes('packag')) notes.push('Use proper food packaging');
  if (lowerText.includes('contaminat')) notes.push('Prevent cross-contamination');
  
  return notes.length > 0 ? notes : ['Follow standard food safety guidelines'];
}

/**
 * Get NGO details by ID
 */
export async function getNGOById(ngoId) {
  try {
    const ngo = await NGO.findById(ngoId)
      .populate('userId', 'name email phone location');
    
    if (!ngo) {
      return { success: false, error: 'NGO not found' };
    }

    return {
      success: true,
      ngo: {
        id: ngo._id,
        name: ngo.organizationName,
        registrationNumber: ngo.registrationNumber,
        capacity: ngo.capacity,
        servingAreas: ngo.servingAreas,
        location: ngo.userId.location,
        primaryContact: ngo.primaryContact,
        verificationStatus: ngo.verificationStatus,
        operatingHours: ngo.operatingHours
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default {
  searchNearbyNGOs,
  getNGOById,
  calculateDistance
};
