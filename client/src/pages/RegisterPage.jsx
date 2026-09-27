import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

const RegisterPage = () => {
  const { register, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'donor',
    phone: '',
    location: {
      address: '',
      lat: '',
      lng: ''
    },
    // NGO-specific fields
    organizationName: '',
    registrationNumber: '',
    capacity: '',
    dietaryNeeds: ['any']
  });
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('location.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        location: {
          ...formData.location,
          [field]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    setLocalError('');
  };

  const handleDietaryNeedsChange = (e) => {
    const { value, checked } = e.target;
    
    if (checked) {
      setFormData({
        ...formData,
        dietaryNeeds: [...formData.dietaryNeeds, value]
      });
    } else {
      setFormData({
        ...formData,
        dietaryNeeds: formData.dietaryNeeds.filter(need => need !== value)
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // Basic validation
    if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.location.address) {
      setLocalError('Please fill in all required fields including address');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    // NGO validation
    if (formData.role === 'ngo') {
      if (!formData.organizationName || !formData.registrationNumber || !formData.capacity) {
        setLocalError('NGO registration requires organization name, registration number, and capacity');
        return;
      }
    }

    // Prepare data for submission
    const submitData = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      phone: formData.phone,
    };

    // Add location data with fallback coordinates
    if (formData.location.address) {
      submitData.location = {
        address: formData.location.address,
        // Provide default Anna Nagar Chennai coordinates if no specific coordinates
        lat: formData.location.lat || 13.0850, // Default to Anna Nagar, Chennai
        lng: formData.location.lng || 80.2101  // Default to Anna Nagar, Chennai
      };
    }

    // Add NGO-specific fields
    if (formData.role === 'ngo') {
      submitData.organizationName = formData.organizationName;
      submitData.registrationNumber = formData.registrationNumber;
      submitData.capacity = parseInt(formData.capacity);
      submitData.dietaryNeeds = formData.dietaryNeeds;
    }

    const result = await register(submitData);
    if (!result.success) {
      setLocalError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-blue-600">🍱 ResQ-AI</h1>
            <p className="mt-2 text-sm text-gray-600">AI-Powered Food Rescue Platform</p>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {(error || localError) && (
            <div className="alert alert-error">
              {localError || error}
            </div>
          )}

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              I am registering as a:
            </label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'donor', label: 'Food Donor', desc: 'Restaurant, Hotel, Caterer' },
                { value: 'ngo', label: 'NGO/Shelter', desc: 'Non-profit Organization' },
                { value: 'volunteer', label: 'Volunteer', desc: 'Delivery Helper' }
              ].map((role) => (
                <label key={role.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={formData.role === role.value}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className={`border-2 rounded-lg p-4 text-center transition-colors ${
                    formData.role === role.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    <div className="font-medium">{role.label}</div>
                    <div className="text-sm text-gray-600">{role.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                required
                className="form-input mt-1"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                required
                className="form-input mt-1"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
              </label>
              <input
                type="password"
                name="password"
                required
                className="form-input mt-1"
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                className="form-input mt-1"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                required
                className="form-input mt-1"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="location.address" className="block text-sm font-medium text-gray-700">
                Address * <span className="text-xs text-gray-500">(e.g., Anna Nagar, Chennai)</span>
              </label>
              <input
                type="text"
                name="location.address"
                required
                className="form-input mt-1"
                placeholder="Enter your complete address"
                value={formData.location.address}
                onChange={handleChange}
              />
              <p className="mt-1 text-xs text-gray-500">
                This will be used to show your location on the map and calculate delivery routes
              </p>
            </div>
          </div>

          {/* NGO-specific fields */}
          {formData.role === 'ngo' && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">NGO Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    name="organizationName"
                    required
                    className="form-input mt-1"
                    placeholder="Enter organization name"
                    value={formData.organizationName}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-700">
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    name="registrationNumber"
                    required
                    className="form-input mt-1"
                    placeholder="NGO registration number"
                    value={formData.registrationNumber}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                    Daily Capacity (people) *
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    required
                    min="1"
                    className="form-input mt-1"
                    placeholder="Number of people served daily"
                    value={formData.capacity}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dietary Requirements Served
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['vegetarian', 'vegan', 'halal', 'kosher', 'gluten-free', 'any'].map((diet) => (
                    <label key={diet} className="flex items-center">
                      <input
                        type="checkbox"
                        value={diet}
                        checked={formData.dietaryNeeds.includes(diet)}
                        onChange={handleDietaryNeedsChange}
                        className="mr-2"
                      />
                      <span className="text-sm capitalize">{diet}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center btn btn-primary text-lg py-3"
            >
              {loading ? (
                <>
                  <div className="spinner mr-2"></div>
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;