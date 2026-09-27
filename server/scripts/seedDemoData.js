import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import NGO from '../models/NGO.js';
import Donation from '../models/Donation.js';

dotenv.config();

// Anna Nagar, Chennai coordinates and nearby areas
const CHENNAI_LOCATIONS = [
  { name: 'Anna Nagar West', lat: 13.0843, lng: 80.2072 },
  { name: 'Anna Nagar East', lat: 13.0915, lng: 80.2163 },
  { name: 'Mogappair', lat: 13.0846, lng: 80.1827 },
  { name: 'Kilpauk', lat: 13.0804, lng: 80.2399 },
  { name: 'Thirumangalam', lat: 13.0919, lng: 80.1916 },
  { name: 'Aminjikarai', lat: 13.0767, lng: 80.2213 },
  { name: 'Shenoy Nagar', lat: 13.0786, lng: 80.2343 },
  { name: 'Kolathur', lat: 13.1298, lng: 80.2122 },
];

const FOOD_CATEGORIES = ['Cooked Food', 'Raw Food', 'Packaged Food', 'Baked Goods', 'Beverages'];

const DEMO_DATA = {
  // 3 Donors
  donors: [
    {
      email: 'donor1@gmail.com',
      password: 'password123',
      name: 'Saravana Bhavan Restaurant',
      phone: '+91 9876543210',
      role: 'donor',
      organizationType: 'restaurant',
      address: '123 Anna Nagar West, Chennai',
      location: CHENNAI_LOCATIONS[0]
    },
    {
      email: 'donor2@gmail.com',
      password: 'password123',
      name: 'Hotel Paradise',
      phone: '+91 9876543211',
      role: 'donor',
      organizationType: 'hotel',
      address: '456 Anna Nagar East, Chennai',
      location: CHENNAI_LOCATIONS[1]
    },
    {
      email: 'donor3@gmail.com',
      password: 'password123',
      name: 'Green Valley Caterers',
      phone: '+91 9876543212',
      role: 'donor',
      organizationType: 'catering',
      address: '789 Mogappair, Chennai',
      location: CHENNAI_LOCATIONS[2]
    }
  ],

  // 5 NGOs
  ngos: [
    {
      email: 'ngo1@gmail.com',
      password: 'password123',
      name: 'Annam Foundation',
      phone: '+91 9876543220',
      role: 'ngo',
      organizationType: 'ngo',
      address: '101 Kilpauk, Chennai',
      location: CHENNAI_LOCATIONS[3],
      ngoDetails: {
        registrationNumber: 'TN/2020/0001234',
        servingAreas: ['Anna Nagar', 'Kilpauk', 'Aminjikarai'],
        capacity: 500
      }
    },
    {
      email: 'ngo2@gmail.com',
      password: 'password123',
      name: 'Feed Chennai Trust',
      phone: '+91 9876543221',
      role: 'ngo',
      organizationType: 'ngo',
      address: '202 Thirumangalam, Chennai',
      location: CHENNAI_LOCATIONS[4],
      ngoDetails: {
        registrationNumber: 'TN/2021/0005678',
        servingAreas: ['Anna Nagar', 'Thirumangalam', 'Mogappair'],
        capacity: 300
      }
    },
    {
      email: 'ngo3@gmail.com',
      password: 'password123',
      name: 'Hope Foundation',
      phone: '+91 9876543222',
      role: 'ngo',
      organizationType: 'ngo',
      address: '303 Aminjikarai, Chennai',
      location: CHENNAI_LOCATIONS[5],
      ngoDetails: {
        registrationNumber: 'TN/2019/0009012',
        servingAreas: ['Anna Nagar', 'Aminjikarai', 'Shenoy Nagar'],
        capacity: 400
      }
    },
    {
      email: 'ngo4@gmail.com',
      password: 'password123',
      name: 'Chennai Food Bank',
      phone: '+91 9876543223',
      role: 'ngo',
      organizationType: 'ngo',
      address: '404 Shenoy Nagar, Chennai',
      location: CHENNAI_LOCATIONS[6],
      ngoDetails: {
        registrationNumber: 'TN/2020/0003456',
        servingAreas: ['Shenoy Nagar', 'Kilpauk', 'Anna Nagar'],
        capacity: 600
      }
    },
    {
      email: 'ngo5@gmail.com',
      password: 'password123',
      name: 'Seva Trust',
      phone: '+91 9876543224',
      role: 'ngo',
      organizationType: 'ngo',
      address: '505 Kolathur, Chennai',
      location: CHENNAI_LOCATIONS[7],
      ngoDetails: {
        registrationNumber: 'TN/2022/0007890',
        servingAreas: ['Kolathur', 'Anna Nagar', 'Mogappair'],
        capacity: 350
      }
    }
  ],

  // 3 Volunteers
  volunteers: [
    {
      email: 'volunteer1@gmail.com',
      password: 'password123',
      name: 'Rajesh Kumar',
      phone: '+91 9876543230',
      role: 'volunteer',
      address: 'Anna Nagar, Chennai',
      location: CHENNAI_LOCATIONS[0],
      vehicleType: 'bike'
    },
    {
      email: 'volunteer2@gmail.com',
      password: 'password123',
      name: 'Priya Sharma',
      phone: '+91 9876543231',
      role: 'volunteer',
      address: 'Kilpauk, Chennai',
      location: CHENNAI_LOCATIONS[3],
      vehicleType: 'car'
    },
    {
      email: 'volunteer3@gmail.com',
      password: 'password123',
      name: 'Arun Patel',
      phone: '+91 9876543232',
      role: 'volunteer',
      address: 'Thirumangalam, Chennai',
      location: CHENNAI_LOCATIONS[4],
      vehicleType: 'bike'
    }
  ]
};

// Generate random donation data
function generateDonations(donorIds) {
  const donations = [];
  const now = new Date();

  const foodItems = [
    { name: 'Biryani', quantity: 5, unit: 'kg', type: 'cooked', temp: 'refrigerated' },
    { name: 'Idli Batter', quantity: 10, unit: 'kg', type: 'raw', temp: 'refrigerated' },
    { name: 'Basmati Rice', quantity: 20, unit: 'kg', type: 'grains', temp: 'room_temp' },
    { name: 'Sambar', quantity: 8, unit: 'liters', type: 'cooked', temp: 'refrigerated' },
    { name: 'Bread Loaves', quantity: 50, unit: 'pieces', type: 'packaged', temp: 'room_temp' },
    { name: 'Vegetable Curry', quantity: 6, unit: 'kg', type: 'cooked', temp: 'refrigerated' },
    { name: 'Chapatis', quantity: 100, unit: 'pieces', type: 'cooked', temp: 'room_temp' },
    { name: 'Biscuits', quantity: 30, unit: 'pieces', type: 'packaged', temp: 'room_temp' },
    { name: 'Fresh Vegetables', quantity: 15, unit: 'kg', type: 'vegetables', temp: 'refrigerated' },
    { name: 'Cakes', quantity: 5, unit: 'pieces', type: 'packaged', temp: 'room_temp' },
    { name: 'Dal', quantity: 10, unit: 'kg', type: 'grains', temp: 'room_temp' },
    { name: 'Fruit Juice', quantity: 20, unit: 'liters', type: 'packaged', temp: 'refrigerated' },
    { name: 'Milk', quantity: 15, unit: 'liters', type: 'dairy', temp: 'refrigerated' },
    { name: 'Apples', quantity: 8, unit: 'kg', type: 'fruits', temp: 'room_temp' },
    { name: 'Paneer', quantity: 3, unit: 'kg', type: 'dairy', temp: 'refrigerated' }
  ];

  // Create 15 donations with varied statuses
  for (let i = 0; i < 15; i++) {
    const donorId = donorIds[i % donorIds.length];
    const food = foodItems[i % foodItems.length];
    const expiryHours = Math.floor(Math.random() * 10) + 2; // 2-12 hours
    const expiryTime = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);
    const prepTime = new Date(now.getTime() - Math.floor(Math.random() * 3) * 60 * 60 * 1000); // Prepared 0-3 hours ago
    
    // Varied statuses: mostly open, some matched/picked_up
    let status = 'open';
    if (i < 2) status = 'matched';
    if (i === 2) status = 'picked_up';
    if (i === 3) status = 'delivered';

    // Determine urgency based on expiry time
    let urgency = 'medium';
    if (expiryHours <= 3) urgency = 'critical';
    else if (expiryHours <= 5) urgency = 'high';
    else if (expiryHours >= 9) urgency = 'low';

    donations.push({
      donorId: donorId,
      foodType: food.type,
      foodName: food.name,
      quantity: food.quantity,
      unit: food.unit,
      prepTime: prepTime,
      storageTemp: food.temp,
      location: {
        lat: CHENNAI_LOCATIONS[i % CHENNAI_LOCATIONS.length].lat,
        lng: CHENNAI_LOCATIONS[i % CHENNAI_LOCATIONS.length].lng,
        address: CHENNAI_LOCATIONS[i % CHENNAI_LOCATIONS.length].name + ', Chennai'
      },
      status: status,
      estimatedShelfLifeEnd: expiryTime,
      dietaryInfo: {
        isVegetarian: true,
        isVegan: food.type !== 'dairy',
        isHalal: true,
        isKosher: false,
        isGlutenFree: food.type !== 'grains'
      },
      contactPerson: 'Manager',
      contactPhone: '+91 9876543210',
      pickupInstructions: 'Please contact before arrival. Available at reception.',
      urgencyLevel: urgency
    });
  }

  return donations;
}

async function seedDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB - use local for now due to DNS issues
    const mongoUri = 'mongodb://localhost:27017/resqai';
    await mongoose.connect(mongoUri);
    
    console.log('✅ Connected to MongoDB');
    console.log('⚠️  Clearing existing data...');

    // Clear existing data
    await User.deleteMany({});
    await NGO.deleteMany({});
    await Donation.deleteMany({});

    console.log('✅ Existing data cleared');
    console.log('🌱 Creating demo users...');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Create Donors
    const donors = await Promise.all(
      DEMO_DATA.donors.map(async (donor) => {
        return await User.create({
          email: donor.email,
          passwordHash: hashedPassword,
          name: donor.name,
          phone: donor.phone,
          role: donor.role,
          location: {
            lat: donor.location.lat,
            lng: donor.location.lng,
            address: donor.address
          }
        });
      })
    );
    console.log(`✅ Created ${donors.length} donors`);

    // Create NGOs
    const ngos = await Promise.all(
      DEMO_DATA.ngos.map(async (ngo) => {
        const user = await User.create({
          email: ngo.email,
          passwordHash: hashedPassword,
          name: ngo.name,
          phone: ngo.phone,
          role: ngo.role,
          organizationName: ngo.name,
          capacity: ngo.ngoDetails.capacity,
          location: {
            lat: ngo.location.lat,
            lng: ngo.location.lng,
            address: ngo.address
          }
        });

        return await NGO.create({
          userId: user._id,
          organizationName: ngo.name,
          registrationNumber: ngo.ngoDetails.registrationNumber,
          capacity: {
            daily: ngo.ngoDetails.capacity,
            current: 0
          },
          servingAreas: ngo.ngoDetails.servingAreas,
          primaryContact: {
            name: 'Manager',
            phone: ngo.phone,
            email: ngo.email
          },
          dietaryNeeds: ['any'],
          verificationStatus: 'verified'
        });
      })
    );
    console.log(`✅ Created ${ngos.length} NGOs`);

    // Create Volunteers
    const volunteers = await Promise.all(
      DEMO_DATA.volunteers.map(async (volunteer) => {
        return await User.create({
          email: volunteer.email,
          passwordHash: hashedPassword,
          name: volunteer.name,
          phone: volunteer.phone,
          role: volunteer.role,
          location: {
            lat: volunteer.location.lat,
            lng: volunteer.location.lng,
            address: volunteer.address
          }
        });
      })
    );
    console.log(`✅ Created ${volunteers.length} volunteers`);

    // Create Donations
    const donorIds = donors.map(d => d._id);
    const donationsData = generateDonations(donorIds);
    const donations = await Donation.insertMany(donationsData);
    console.log(`✅ Created ${donations.length} donations`);

    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║                                                  ║');
    console.log('║        🎉 Demo Data Seeded Successfully! 🎉     ║');
    console.log('║                                                  ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    console.log('📊 Summary:');
    console.log(`   • ${donors.length} Donors`);
    console.log(`   • ${ngos.length} NGOs`);
    console.log(`   • ${volunteers.length} Volunteers`);
    console.log(`   • ${donations.length} Donations`);
    console.log('\n🔐 Login Credentials (all passwords: password123):');
    console.log('\n   Donors:');
    DEMO_DATA.donors.forEach((d, i) => {
      console.log(`     ${i + 1}. ${d.email} (${d.name})`);
    });
    console.log('\n   NGOs:');
    DEMO_DATA.ngos.forEach((n, i) => {
      console.log(`     ${i + 1}. ${n.email} (${n.name})`);
    });
    console.log('\n   Volunteers:');
    DEMO_DATA.volunteers.forEach((v, i) => {
      console.log(`     ${i + 1}. ${v.email} (${v.name})`);
    });
    console.log('\n📍 All users located in Anna Nagar area, Chennai');
    console.log('🌐 Server URL: http://localhost:5001');
    console.log('🎨 Frontend URL: http://localhost:3001\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeder
seedDatabase();
