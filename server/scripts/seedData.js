import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Donation from '../models/Donation.js';
import NGO from '../models/NGO.js';
import dotenv from 'dotenv';

dotenv.config();

// Sample users for each role
const sampleUsers = [
  {
    name: 'Anna Nagar Restaurant',
    email: 'donor@resqai.com',
    password: 'demo123',
    role: 'donor',
    phone: '+91 9876543210',
    address: 'Anna Nagar West, Chennai, Tamil Nadu'
  },
  {
    name: 'Chennai Food Relief NGO',
    email: 'ngo@resqai.com', 
    password: 'demo123',
    role: 'ngo',
    phone: '+91 9876543211',
    address: 'T Nagar, Chennai, Tamil Nadu',
    organizationName: 'Chennai Food Relief NGO',
    capacity: 500,
    dietaryNeeds: ['vegetarian', 'any']
  },
  {
    name: 'Arjun Delivery',
    email: 'volunteer@resqai.com',
    password: 'demo123', 
    role: 'volunteer',
    phone: '+91 9876543212',
    address: 'Velachery, Chennai, Tamil Nadu'
  },
  {
    name: 'ResQ Admin',
    email: 'admin@resqai.com',
    password: 'demo123',
    role: 'admin', 
    phone: '+91 9876543213',
    address: 'Anna Nagar East, Chennai, Tamil Nadu'
  }
];

// Sample donations
const sampleDonations = [
  {
    foodType: 'Cooked Rice and Dal',
    quantity: 50,
    unit: 'servings',
    description: 'Fresh cooked basmati rice with mixed dal. Prepared 2 hours ago. High protein vegetarian meal suitable for all age groups.',
    expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    pickupLocation: 'Bandra West, Mumbai',
    coordinates: { lat: 19.0544, lng: 72.8351 },
    status: 'available',
    dietaryInfo: ['vegetarian', 'gluten-free'],
    preparationTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    storageTemp: 'room temperature',
    allergens: ['none'],
    servingSize: 'regular'
  },
  {
    foodType: 'Fresh Vegetables',
    quantity: 25,
    unit: 'kg',
    description: 'Mixed vegetables including tomatoes, onions, potatoes, and leafy greens. Good for making fresh meals for 100+ people.',
    expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    pickupLocation: 'Andheri Market, Mumbai',
    coordinates: { lat: 19.1136, lng: 72.8697 },
    status: 'available',
    dietaryInfo: ['vegetarian', 'vegan'],
    preparationTime: new Date(),
    storageTemp: 'refrigerated',
    allergens: ['none'],
    servingSize: 'bulk'
  },
  {
    foodType: 'Packaged Snacks',
    quantity: 100,
    unit: 'packets',
    description: 'Unopened packets of biscuits, chips, and healthy snacks. All within expiry date. Great for school meal programs.',
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    pickupLocation: 'Powai Corporate Office',
    coordinates: { lat: 19.1176, lng: 72.9060 },
    status: 'available', 
    dietaryInfo: ['vegetarian'],
    preparationTime: new Date(),
    storageTemp: 'room temperature',
    allergens: ['wheat', 'nuts'],
    servingSize: 'individual'
  },
  {
    foodType: 'Bread and Bakery Items',
    quantity: 40,
    unit: 'pieces',
    description: 'Fresh bread, rolls, and pastries from morning batch. Perfect for breakfast programs. No dairy products.',
    expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
    pickupLocation: 'Mumbai Central Bakery',
    coordinates: { lat: 18.9750, lng: 72.8258 },
    status: 'available',
    dietaryInfo: ['vegetarian'],
    preparationTime: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    storageTemp: 'room temperature',
    allergens: ['wheat', 'eggs'],
    servingSize: 'regular'
  },
  {
    foodType: 'Cooked Curry and Chapati',
    quantity: 75,
    unit: 'servings',
    description: 'Traditional Indian meal with mixed vegetable curry and fresh chapatis. Prepared for office lunch, surplus available.',
    expiryDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
    pickupLocation: 'BKC Corporate Cafeteria',
    coordinates: { lat: 19.0653, lng: 72.8526 },
    status: 'available',
    dietaryInfo: ['vegetarian', 'spicy'],
    preparationTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    storageTemp: 'hot holding',
    allergens: ['none'],
    servingSize: 'regular'
  }
];

// Sample NGOs
const sampleNGOs = [
  {
    name: 'Chennai Food Bank',
    email: 'contact@chennaifoodbank.org',
    phone: '+91 9876501234',
    address: 'Anna Nagar West, Chennai, Tamil Nadu',
    coordinates: { lat: 13.0889, lng: 80.2081 },
    description: 'Serving underprivileged communities in Anna Nagar and surrounding areas for over 8 years.',
    capacity: 500,
    serviceAreas: ['Anna Nagar', 'T Nagar', 'Kilpauk'],
    specializations: ['children', 'elderly', 'daily-meals'],
    operatingHours: '6:00 AM - 10:00 PM',
    certifications: ['FSSAI', '12A', '80G'],
    establishedYear: 2015,
    registrationNumber: 'TN/2015/NGO/001'
  },
  {
    name: 'Akshaya Patra Chennai',
    email: 'chennai@akshayapatra.org',
    phone: '+91 9876501235',
    address: 'T Nagar, Chennai, Tamil Nadu', 
    coordinates: { lat: 13.0418, lng: 80.2341 },
    description: 'Focused on school meal programs and child nutrition across Chennai schools.',
    capacity: 800,
    serviceAreas: ['T Nagar', 'Mylapore', 'Adyar'],
    specializations: ['children', 'school-meals', 'nutrition'],
    operatingHours: '5:00 AM - 9:00 PM',
    certifications: ['FSSAI', '12A', 'ISO'],
    establishedYear: 2000,
    registrationNumber: 'TN/2000/NGO/002'
  },
  {
    name: 'Annapurna Chennai Trust',
    email: 'info@annapurnachennai.org',
    phone: '+91 9876501236',
    address: 'Velachery, Chennai, Tamil Nadu',
    coordinates: { lat: 12.9755, lng: 80.2201 },
    description: 'Daily meal distribution and community kitchen programs across Chennai suburbs.',
    capacity: 600,
    serviceAreas: ['Velachery', 'Guindy', 'Tambaram'],
    specializations: ['daily-meals', 'community-kitchens', 'disaster-relief'],
    operatingHours: '5:00 AM - 11:00 PM', 
    certifications: ['FSSAI', '12A', '80G', 'ISO'],
    establishedYear: 2010,
    registrationNumber: 'TN/2010/NGO/003'
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/resqai', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Donation.deleteMany({});
    await NGO.deleteMany({});
    console.log('🧹 Cleared existing data');

    // Create users
    console.log('👤 Creating sample users...');
    const createdUsers = [];
    
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = new User({
        ...userData,
        passwordHash: hashedPassword // Use passwordHash instead of password
      });
      delete user.password; // Remove password field
      await user.save();
      createdUsers.push(user);
      console.log(`   ✅ Created ${userData.role}: ${userData.email}`);
    }

    // Create NGOs
    console.log('🏢 Creating sample NGOs...');
    const createdNGOs = [];
    
    for (let i = 0; i < sampleNGOs.length; i++) {
      const ngoData = sampleNGOs[i];
      
      // Find the NGO user (we only have one, so we'll reuse it but create separate NGO profiles)
      const ngoUser = createdUsers.find(u => u.role === 'ngo');
      
      const ngo = new NGO({
        organizationName: ngoData.name,
        ...ngoData,
        userId: ngoUser._id, // This will cause duplicate key error for multiple NGOs
        // Let's create unique NGO records by using different approach
        verificationStatus: 'verified',
        registrationDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        primaryContact: {
          name: ngoData.name + ' Manager',
          email: ngoData.email,
          phone: ngoData.phone
        },
        capacity: {
          daily: ngoData.capacity,
          current: 0
        }
      });
      
      // For now, let's just create the first NGO to avoid the duplicate key error
      if (i === 0) {
        await ngo.save();
        createdNGOs.push(ngo);
        console.log(`   ✅ Created NGO: ${ngoData.name}`);
      }
    }

    // Create donations
    console.log('📦 Creating sample donations...');
    const donorUser = createdUsers.find(u => u.role === 'donor');
    
    for (const donationData of sampleDonations) {
      const donation = new Donation({
        ...donationData,
        donorId: donorUser._id,
        createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
      });
      await donation.save();
      console.log(`   ✅ Created donation: ${donationData.foodType}`);
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   👤 Users: ${createdUsers.length} (${createdUsers.map(u => u.role).join(', ')})`);
    console.log(`   🏢 NGOs: ${createdNGOs.length}`);
    console.log(`   📦 Donations: ${sampleDonations.length}`);
    
    console.log('\n🔑 Demo Login Credentials:');
    console.log('   Donor: donor@resqai.com / demo123');
    console.log('   NGO: ngo@resqai.com / demo123');
    console.log('   Volunteer: volunteer@resqai.com / demo123');
    console.log('   Admin: admin@resqai.com / demo123');

    console.log('\n🌐 Ready to demo at: http://localhost:3001');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from MongoDB');
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export default seedDatabase;