import User from '../models/User.js';
import Donation from '../models/Donation.js';
import emailService from './emailService.js';

// Optional: Try to import routing service, but don't fail if it doesn't exist
let calculateRoute;
try {
  const routingModule = await import('./routingService.js');
  calculateRoute = routingModule.calculateRoute;
} catch (error) {
  console.log('⚠️ Routing service not available, will use straight-line distances');
  calculateRoute = null;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - {lat, lng}
 * @param {Object} coord2 - {lat, lng}
 * @returns {number} Distance in kilometers
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
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Find and assign best volunteer for a donation pickup
 * @param {Object} donation - Donation document
 * @param {Object} donor - Donor user document
 * @param {Object} ngo - NGO document with populated userId
 * @returns {Object} Assignment result
 */
export async function assignVolunteer(donation, donor, ngo) {
  try {
    console.log('🔍 Finding available volunteers...');
    
    // Find all active volunteers
    const volunteers = await User.find({
      role: 'volunteer',
      isActive: true
    }).select('name email phone location');

    if (volunteers.length === 0) {
      console.log('⚠️ No volunteers available');
      return {
        success: false,
        error: 'No volunteers available at this time'
      };
    }

    console.log(`✅ Found ${volunteers.length} volunteers`);

    // Calculate distances from donor location to each volunteer
    const volunteersWithDistance = volunteers.map(volunteer => {
      const distance = calculateDistance(
        { lat: donor.location.lat, lng: donor.location.lng },
        { lat: volunteer.location.lat, lng: volunteer.location.lng }
      );
      
      return {
        volunteer,
        distance,
        score: calculateVolunteerScore(volunteer, distance, donation)
      };
    }).sort((a, b) => b.score - a.score); // Sort by score (higher is better)

    // Select best volunteer
    const bestMatch = volunteersWithDistance[0];
    const selectedVolunteer = bestMatch.volunteer;

    console.log(`🎯 Selected volunteer: ${selectedVolunteer.name} (${bestMatch.distance} km away, score: ${bestMatch.score})`);

    // Calculate route from donor to NGO
    let route = {
      distance: calculateDistance(
        { lat: donor.location.lat, lng: donor.location.lng },
        { lat: ngo.userId.location.lat, lng: ngo.userId.location.lng }
      ),
      duration: 0,
      fuelSavings: '35%' // Mock value
    };

    try {
      // Try to get actual route from OSRM (if available)
      if (calculateRoute) {
        const osrmRoute = await calculateRoute(
          { lat: donor.location.lat, lng: donor.location.lng },
          { lat: ngo.userId.location.lat, lng: ngo.userId.location.lng }
        );
        
        if (osrmRoute.success) {
          route = {
            distance: osrmRoute.distance,
            duration: osrmRoute.duration,
            fuelSavings: '35%',
            geometry: osrmRoute.geometry
          };
        }
      }
    } catch (error) {
      console.log('⚠️ OSRM route calculation failed, using straight-line distance:', error.message);
    }

    // Update donation with volunteer assignment
    donation.volunteerId = selectedVolunteer._id;
    donation.status = 'matched'; // Keep as matched, will change to picked_up when volunteer confirms
    await donation.save();

    console.log('✅ Donation updated with volunteer assignment');

    // Send email notifications
    console.log('📧 Sending email notifications...');

    // 1. Email to volunteer
    await emailService.sendVolunteerAssignment({
      volunteer: selectedVolunteer,
      donation: {
        _id: donation._id,
        foodName: donation.foodName,
        foodType: donation.foodType,
        quantity: donation.quantity,
        unit: donation.unit,
        estimatedShelfLifeEnd: donation.estimatedShelfLifeEnd,
        urgencyLevel: donation.urgencyLevel
      },
      donor: {
        name: donor.name,
        phone: donor.phone,
        location: donor.location
      },
      ngo: {
        name: ngo.organizationName,
        location: ngo.userId.location,
        primaryContact: ngo.primaryContact
      },
      route
    });

    // 2. Email to NGO (confirmation)
    await emailService.sendNGOMatchConfirmation({
      ngo: {
        name: ngo.organizationName,
        email: ngo.primaryContact.email
      },
      donation: {
        foodName: donation.foodName,
        quantity: donation.quantity,
        unit: donation.unit
      },
      donor: {
        name: donor.name,
        location: donor.location,
        phone: donor.phone
      }
    });

    // 3. Email to donor (pickup notification)
    const eta = route.duration ? `${Math.round(route.duration)} minutes` : 'TBD';
    await emailService.sendDonorPickupNotification({
      donor: {
        name: donor.name,
        email: donor.email
      },
      donation: {
        foodName: donation.foodName,
        quantity: donation.quantity,
        unit: donation.unit
      },
      volunteer: {
        name: selectedVolunteer.name,
        phone: selectedVolunteer.phone
      },
      ngo: {
        name: ngo.organizationName,
        location: ngo.userId.location
      },
      eta
    });

    console.log('✅ All notifications sent successfully');

    return {
      success: true,
      volunteer: {
        id: selectedVolunteer._id,
        name: selectedVolunteer.name,
        phone: selectedVolunteer.phone,
        distance: bestMatch.distance
      },
      route
    };

  } catch (error) {
    console.error('❌ Volunteer assignment error:', error);
    return {
      success: false,
      error: error.message || 'Failed to assign volunteer'
    };
  }
}

/**
 * Calculate volunteer suitability score
 * Higher score = better match
 */
function calculateVolunteerScore(volunteer, distance, donation) {
  let score = 100;

  // Distance penalty (closer is better)
  if (distance <= 2) score += 50;
  else if (distance <= 5) score += 30;
  else if (distance <= 10) score += 10;
  else if (distance > 20) score -= 30;

  // TODO: Add more scoring factors:
  // - Volunteer availability/schedule
  // - Past performance/rating
  // - Vehicle type (bike vs car)
  // - Current workload

  return score;
}

export default {
  assignVolunteer,
  calculateDistance
};
