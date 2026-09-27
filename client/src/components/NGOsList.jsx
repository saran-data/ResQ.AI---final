import { useState } from 'react';

const NGOsList = ({ ngos, userRole, loading }) => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading NGOs...</p>
        </div>
      </div>
    );
  }

  // Filter and search NGOs
  const filteredNGOs = ngos.filter(ngo => {
    const matchesFilter = filter === 'all' || 
      (filter === 'verified' && ngo.verificationStatus === 'verified') ||
      (filter === 'pending' && ngo.verificationStatus === 'pending');
    
    const matchesSearch = !searchTerm || 
      ngo.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ngo.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ngo.servingAreas?.some(area => area.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const getVerificationBadge = (status) => {
    const statusConfig = {
      verified: { color: 'bg-green-100 text-green-800', icon: '✓', label: 'Verified' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: '⏳', label: 'Pending' },
      rejected: { color: 'bg-red-100 text-red-800', icon: '✗', label: 'Rejected' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  const getRatingStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push('⭐');
    }
    if (hasHalfStar) {
      stars.push('✨');
    }
    while (stars.length < 5) {
      stars.push('☆');
    }

    return stars.join('');
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            🏢 {userRole === 'admin' ? 'Manage NGOs' : 'Partner NGOs'}
          </h2>
          
          <div className="flex space-x-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search NGOs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input text-sm w-48"
            />

            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="form-select text-sm"
            >
              <option value="all">All NGOs</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {filteredNGOs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No NGOs found</h3>
            <p className="text-gray-600">
              {searchTerm 
                ? `No NGOs match "${searchTerm}"`
                : "No NGOs are currently registered."
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNGOs.map((ngo) => (
              <NGOCard 
                key={ngo._id} 
                ngo={ngo} 
                userRole={userRole}
                getVerificationBadge={getVerificationBadge}
                getRatingStars={getRatingStars}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">
            {ngos.filter(n => n.verificationStatus === 'verified').length}
          </div>
          <div className="text-sm text-gray-600">Verified NGOs</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {ngos.filter(n => n.verificationStatus === 'pending').length}
          </div>
          <div className="text-sm text-gray-600">Pending Review</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">
            {ngos.reduce((sum, n) => sum + (n.capacity?.daily || 0), 0)}
          </div>
          <div className="text-sm text-gray-600">Total Capacity</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-600">
            {(ngos.reduce((sum, n) => sum + (n.rating?.average || 0), 0) / ngos.length || 0).toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">Avg Rating</div>
        </div>
      </div>
    </div>
  );
};

// Individual NGO Card Component
const NGOCard = ({ ngo, userRole, getVerificationBadge, getRatingStars }) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleVerify = (status) => {
    // TODO: Implement verification API call
    alert(`NGO verification (${status}) will be implemented in Phase 2!`);
  };

  const handleRate = () => {
    // TODO: Implement rating system
    alert('Rating system will be implemented in Phase 2!');
  };

  const availability = ngo.capacity ? 
    ((ngo.capacity.daily - ngo.capacity.current) / ngo.capacity.daily * 100) : 0;

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{ngo.organizationName}</h3>
          <p className="text-sm text-gray-600">
            {ngo.userId?.name} • {ngo.userId?.email}
          </p>
        </div>
        {getVerificationBadge(ngo.verificationStatus)}
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <p className="text-sm font-medium text-gray-700">📍 Location</p>
          <p className="text-sm text-gray-600">
            {ngo.userId?.location?.address || 'Address not provided'}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700">👥 Capacity</p>
          <p className="text-sm text-gray-600">
            {ngo.capacity?.current || 0} / {ngo.capacity?.daily || 0} people daily
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${Math.max(0, availability)}%` }}
            ></div>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700">🍽️ Dietary Needs</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {(ngo.dietaryNeeds || ['any']).map((diet, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded capitalize">
                {diet}
              </span>
            ))}
          </div>
        </div>

        {ngo.rating && ngo.rating.count > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700">⭐ Rating</p>
            <p className="text-sm text-gray-600">
              {getRatingStars(ngo.rating.average)} 
              {ngo.rating.average.toFixed(1)} ({ngo.rating.count} reviews)
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          Registered {new Date(ngo.createdAt).toLocaleDateString()}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="btn btn-secondary text-sm px-3 py-1"
          >
            {showDetails ? 'Less' : 'More'}
          </button>

          {userRole === 'donor' && ngo.verificationStatus === 'verified' && (
            <button
              onClick={handleRate}
              className="btn btn-primary text-sm px-3 py-1"
            >
              ⭐ Rate
            </button>
          )}

          {userRole === 'admin' && ngo.verificationStatus === 'pending' && (
            <>
              <button
                onClick={() => handleVerify('verified')}
                className="btn btn-success text-sm px-3 py-1"
              >
                ✓ Verify
              </button>
              <button
                onClick={() => handleVerify('rejected')}
                className="btn btn-danger text-sm px-3 py-1"
              >
                ✗ Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* Detailed View */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Registration Number</p>
            <p className="text-sm text-gray-600">{ngo.registrationNumber}</p>
          </div>

          {ngo.primaryContact && (
            <div>
              <p className="text-sm font-medium text-gray-700">Primary Contact</p>
              <p className="text-sm text-gray-600">
                {ngo.primaryContact.name} • {ngo.primaryContact.phone}
              </p>
            </div>
          )}

          {ngo.servingAreas && ngo.servingAreas.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700">Serving Areas</p>
              <p className="text-sm text-gray-600">{ngo.servingAreas.join(', ')}</p>
            </div>
          )}

          {ngo.operatingHours && (
            <div>
              <p className="text-sm font-medium text-gray-700">Operating Hours</p>
              <div className="text-xs text-gray-600 grid grid-cols-2 gap-1">
                {Object.entries(ngo.operatingHours).map(([day, hours]) => (
                  <div key={day}>
                    <strong className="capitalize">{day}:</strong> {
                      hours.closed ? 'Closed' : `${hours.start || 'N/A'} - ${hours.end || 'N/A'}`
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {ngo.stats && (
            <div>
              <p className="text-sm font-medium text-gray-700">Statistics</p>
              <div className="text-xs text-gray-600 grid grid-cols-3 gap-2">
                <div>Donations: {ngo.stats.totalDonationsReceived || 0}</div>
                <div>Meals: {ngo.stats.totalMealsServed || 0}</div>
                <div>Pickups: {ngo.stats.successfulPickups || 0}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NGOsList;