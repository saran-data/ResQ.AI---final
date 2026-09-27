import { useState } from 'react';

const DonationsList = ({ donations, userRole, loading }) => {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading donations...</p>
        </div>
      </div>
    );
  }

  // Filter donations
  const filteredDonations = donations.filter(donation => {
    if (filter === 'all') return true;
    return donation.status === filter;
  });

  // Sort donations
  const sortedDonations = [...filteredDonations].sort((a, b) => {
    switch (sortBy) {
      case 'createdAt':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'urgency':
        const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return urgencyOrder[b.urgencyLevel] - urgencyOrder[a.urgencyLevel];
      case 'quantity':
        return b.quantity - a.quantity;
      case 'shelfLife':
        return new Date(a.estimatedShelfLifeEnd) - new Date(b.estimatedShelfLifeEnd);
      default:
        return 0;
    }
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      open: { color: 'bg-green-100 text-green-800', label: 'Available' },
      matched: { color: 'bg-blue-100 text-blue-800', label: 'Matched' },
      picked_up: { color: 'bg-yellow-100 text-yellow-800', label: 'Picked Up' },
      delivered: { color: 'bg-gray-100 text-gray-800', label: 'Delivered' },
      expired: { color: 'bg-red-100 text-red-800', label: 'Expired' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
    };

    const config = statusConfig[status] || statusConfig.open;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getUrgencyBadge = (urgency) => {
    const urgencyConfig = {
      critical: { color: 'bg-red-500 text-white', icon: '🚨' },
      high: { color: 'bg-orange-500 text-white', icon: '⚡' },
      medium: { color: 'bg-yellow-500 text-white', icon: '⏰' },
      low: { color: 'bg-green-500 text-white', icon: '🟢' }
    };

    const config = urgencyConfig[urgency] || urgencyConfig.medium;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon} {urgency.toUpperCase()}
      </span>
    );
  };

  const formatTimeRemaining = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diffMs = end - now;

    if (diffMs <= 0) return '⏰ Expired';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            📦 {userRole === 'donor' ? 'My Donations' : 'Available Donations'}
          </h2>
          
          <div className="flex space-x-4">
            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="form-select text-sm"
            >
              <option value="all">All Status</option>
              <option value="open">Available</option>
              <option value="matched">Matched</option>
              <option value="picked_up">Picked Up</option>
              <option value="delivered">Delivered</option>
              <option value="expired">Expired</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select text-sm"
            >
              <option value="createdAt">Latest First</option>
              <option value="urgency">By Urgency</option>
              <option value="quantity">By Quantity</option>
              <option value="shelfLife">By Shelf Life</option>
            </select>
          </div>
        </div>

        {sortedDonations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No donations found</h3>
            <p className="text-gray-600">
              {userRole === 'donor' 
                ? "You haven't created any donations yet. Click 'List Donation' to get started!"
                : "No donations are currently available. Check back later."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDonations.map((donation) => (
              <DonationCard 
                key={donation._id} 
                donation={donation} 
                userRole={userRole}
                getStatusBadge={getStatusBadge}
                getUrgencyBadge={getUrgencyBadge}
                formatTimeRemaining={formatTimeRemaining}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">
            {donations.filter(d => d.status === 'open').length}
          </div>
          <div className="text-sm text-gray-600">Available</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">
            {donations.filter(d => d.status === 'matched').length}
          </div>
          <div className="text-sm text-gray-600">Matched</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {donations.filter(d => d.status === 'picked_up').length}
          </div>
          <div className="text-sm text-gray-600">In Transit</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-600">
            {donations.filter(d => d.status === 'delivered').length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
      </div>
    </div>
  );
};

// Individual Donation Card Component
const DonationCard = ({ 
  donation, 
  userRole, 
  getStatusBadge, 
  getUrgencyBadge, 
  formatTimeRemaining 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleFindMatches = () => {
    // TODO Phase 2: Implement matching algorithm
    alert('Matching system will be available in Phase 2!');
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{donation.foodName}</h3>
          <p className="text-sm text-gray-600 capitalize">
            {donation.foodType} • {donation.quantity} {donation.unit}
          </p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          {getStatusBadge(donation.status)}
          {getUrgencyBadge(donation.urgencyLevel)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-sm font-medium text-gray-700">📍 Location</p>
          <p className="text-sm text-gray-600">{donation.location?.address}</p>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-700">⏰ Shelf Life</p>
          <p className="text-sm text-gray-600">
            {formatTimeRemaining(donation.estimatedShelfLifeEnd)}
          </p>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-700">🌡️ Storage</p>
          <p className="text-sm text-gray-600 capitalize">
            {donation.storageTemp.replace('_', ' ')}
          </p>
        </div>
      </div>

      {/* Dietary Info */}
      {Object.values(donation.dietaryInfo || {}).some(Boolean) && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-1">🍽️ Dietary</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(donation.dietaryInfo || {})
              .filter(([_, value]) => value)
              .map(([key, _]) => (
                <span key={key} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  {key.replace('is', '').replace(/([A-Z])/g, ' $1').trim()}
                </span>
              ))
            }
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          Listed {new Date(donation.createdAt).toLocaleString()}
          {donation.donorId && (
            <span> by {donation.donorId.name}</span>
          )}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="btn btn-secondary text-sm px-3 py-1"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
          
          {(userRole === 'donor' && donation.status === 'open') && (
            <button
              onClick={handleFindMatches}
              className="btn btn-primary text-sm px-3 py-1"
            >
              🎯 Find Matches
            </button>
          )}
          
          {(userRole === 'ngo' && donation.status === 'open') && (
            <button
              onClick={() => alert('Request system will be available in Phase 2!')}
              className="btn btn-success text-sm px-3 py-1"
            >
              📋 Request
            </button>
          )}
        </div>
      </div>

      {/* Detailed View */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
          <div>
            <p className="text-sm font-medium text-gray-700">Preparation Time</p>
            <p className="text-sm text-gray-600">
              {new Date(donation.prepTime).toLocaleString()}
            </p>
          </div>
          
          {donation.contactPerson && (
            <div>
              <p className="text-sm font-medium text-gray-700">Contact</p>
              <p className="text-sm text-gray-600">
                {donation.contactPerson}
                {donation.contactPhone && ` • ${donation.contactPhone}`}
              </p>
            </div>
          )}
          
          {donation.pickupInstructions && (
            <div>
              <p className="text-sm font-medium text-gray-700">Pickup Instructions</p>
              <p className="text-sm text-gray-600">{donation.pickupInstructions}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DonationsList;