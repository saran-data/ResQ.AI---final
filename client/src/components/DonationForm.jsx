import { useState } from 'react';

const DonationForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    foodName: '',
    foodType: 'cooked',
    quantity: '',
    unit: 'kg',
    prepTime: new Date().toISOString().slice(0, 16), // Current date-time
    storageTemp: 'refrigerated',
    location: {
      address: '',
      lat: '',
      lng: ''
    },
    dietaryInfo: {
      isVegetarian: false,
      isVegan: false,
      isHalal: false,
      isKosher: false,
      isGlutenFree: false
    },
    contactPerson: '',
    contactPhone: '',
    pickupInstructions: '',
    urgencyLevel: 'medium',
    deliveryMethod: 'volunteer_pickup' // ADDED: Delivery preference
  });

  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('location.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        location: {
          ...formData.location,
          [field]: value
        }
      });
    } else if (name.includes('dietaryInfo.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        dietaryInfo: {
          ...formData.dietaryInfo,
          [field]: type === 'checkbox' ? checked : value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
    
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // Basic validation
    if (!formData.foodName || !formData.quantity || !formData.location.address) {
      setLocalError('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.quantity) <= 0) {
      setLocalError('Quantity must be greater than 0');
      return;
    }

    // For demo purposes, use Chennai coordinates if not provided
    const submitData = {
      ...formData,
      quantity: parseFloat(formData.quantity),
      location: {
        ...formData.location,
        lat: formData.location.lat || 13.0850, // Default Chennai (Anna Nagar) coordinates
        lng: formData.location.lng || 80.2101
      }
    };

    const result = await onSubmit(submitData);
    
    if (result && result.success) {
      // Reset form
      setFormData({
        foodName: '',
        foodType: 'cooked',
        quantity: '',
        unit: 'kg',
        prepTime: new Date().toISOString().slice(0, 16),
        storageTemp: 'refrigerated',
        location: {
          address: '',
          lat: '',
          lng: ''
        },
        dietaryInfo: {
          isVegetarian: false,
          isVegan: false,
          isHalal: false,
          isKosher: false,
          isGlutenFree: false
        },
        contactPerson: '',
        contactPhone: '',
        pickupInstructions: '',
        urgencyLevel: 'medium',
        deliveryMethod: 'volunteer_pickup' // ADDED
      });
    } else if (result && result.error) {
      setLocalError(result.error);
    }
  };

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-6">📝 List a Food Donation</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {localError && (
          <div className="alert alert-error">
            {localError}
          </div>
        )}

        {/* Basic Food Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="foodName" className="block text-sm font-medium text-gray-700">
              Food Name *
            </label>
            <input
              type="text"
              name="foodName"
              required
              className="form-input mt-1"
              placeholder="e.g., Biryani, Sandwiches, Vegetables"
              value={formData.foodName}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="foodType" className="block text-sm font-medium text-gray-700">
              Food Type *
            </label>
            <select
              name="foodType"
              required
              className="form-select mt-1"
              value={formData.foodType}
              onChange={handleChange}
            >
              <option value="cooked">Cooked Food</option>
              <option value="raw">Raw Ingredients</option>
              <option value="packaged">Packaged Food</option>
              <option value="fruits">Fresh Fruits</option>
              <option value="vegetables">Fresh Vegetables</option>
              <option value="dairy">Dairy Products</option>
              <option value="grains">Grains/Cereals</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
              Quantity *
            </label>
            <input
              type="number"
              name="quantity"
              required
              min="0.1"
              step="0.1"
              className="form-input mt-1"
              placeholder="0.0"
              value={formData.quantity}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
              Unit *
            </label>
            <select
              name="unit"
              required
              className="form-select mt-1"
              value={formData.unit}
              onChange={handleChange}
            >
              <option value="kg">Kilograms (kg)</option>
              <option value="grams">Grams (g)</option>
              <option value="liters">Liters (L)</option>
              <option value="pieces">Pieces</option>
              <option value="portions">Portions</option>
            </select>
          </div>

          <div>
            <label htmlFor="prepTime" className="block text-sm font-medium text-gray-700">
              Preparation Time *
            </label>
            <input
              type="datetime-local"
              name="prepTime"
              required
              className="form-input mt-1"
              value={formData.prepTime}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="storageTemp" className="block text-sm font-medium text-gray-700">
              Storage Temperature *
            </label>
            <select
              name="storageTemp"
              required
              className="form-select mt-1"
              value={formData.storageTemp}
              onChange={handleChange}
            >
              <option value="frozen">Frozen (Below 0°C)</option>
              <option value="refrigerated">Refrigerated (0-4°C)</option>
              <option value="room_temp">Room Temperature</option>
            </select>
          </div>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location.address" className="block text-sm font-medium text-gray-700">
            Pickup Address *
          </label>
          <textarea
            name="location.address"
            required
            rows="2"
            className="form-input mt-1"
            placeholder="Enter full pickup address"
            value={formData.location.address}
            onChange={handleChange}
          />
          <p className="text-xs text-gray-500 mt-1">
            For demo: GPS coordinates will be auto-generated. In production, integrate with maps API.
          </p>
        </div>

        {/* Dietary Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dietary Information
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { key: 'isVegetarian', label: 'Vegetarian' },
              { key: 'isVegan', label: 'Vegan' },
              { key: 'isHalal', label: 'Halal' },
              { key: 'isKosher', label: 'Kosher' },
              { key: 'isGlutenFree', label: 'Gluten-Free' }
            ].map((diet) => (
              <label key={diet.key} className="flex items-center">
                <input
                  type="checkbox"
                  name={`dietaryInfo.${diet.key}`}
                  checked={formData.dietaryInfo[diet.key]}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-sm">{diet.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Contact & Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700">
              Contact Person
            </label>
            <input
              type="text"
              name="contactPerson"
              className="form-input mt-1"
              placeholder="Name for pickup coordination"
              value={formData.contactPerson}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">
              Contact Phone
            </label>
            <input
              type="tel"
              name="contactPhone"
              className="form-input mt-1"
              placeholder="Phone for pickup coordination"
              value={formData.contactPhone}
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
          <label htmlFor="pickupInstructions" className="block text-sm font-medium text-gray-700">
            Pickup Instructions
          </label>
          <textarea
            name="pickupInstructions"
            rows="3"
            className="form-input mt-1"
            placeholder="Special instructions for pickup (gate code, parking, etc.)"
            value={formData.pickupInstructions}
            onChange={handleChange}
          />
        </div>

        {/* ADDED: Delivery Method Field */}
        <div>
          <label htmlFor="deliveryMethod" className="block text-sm font-medium text-gray-700">
            Delivery Method *
          </label>
          <select
            name="deliveryMethod"
            required
            className="form-select mt-1"
            value={formData.deliveryMethod}
            onChange={handleChange}
          >
            <option value="volunteer_pickup">🚚 Need volunteer pickup</option>
            <option value="self_delivery">✅ I can deliver to NGO</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Select if you can deliver the food directly or need a volunteer to pick it up
          </p>
        </div>

        <div>
          <label htmlFor="urgencyLevel" className="block text-sm font-medium text-gray-700">
            Urgency Level
          </label>
          <select
            name="urgencyLevel"
            className="form-select mt-1"
            value={formData.urgencyLevel}
            onChange={handleChange}
          >
            <option value="low">Low - Can wait 1+ days</option>
            <option value="medium">Medium - Should be picked up today</option>
            <option value="high">High - Pick up within 6 hours</option>
            <option value="critical">Critical - Pick up within 2 hours</option>
          </select>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary px-6"
          >
            {loading ? (
              <>
                <div className="spinner mr-2"></div>
                Creating...
              </>
            ) : (
              '📝 List Donation'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DonationForm;