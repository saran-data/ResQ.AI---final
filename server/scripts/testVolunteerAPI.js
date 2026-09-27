/**
 * Test script to verify volunteer can see donations
 * Run: node scripts/testVolunteerAPI.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Donation = require('../models/Donation');
require('dotenv').config();

async function testVolunteerView() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/resqai';
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find volunteer user
    const volunteer = await User.findOne({ email: 'volunteer@test.com' });
    if (!volunteer) {
      console.error('❌ Volunteer user not found. Run: npm run seed-demo');
      process.exit(1);
    }
    console.log('👤 Found volunteer:', volunteer.email);
    console.log('   User ID:', volunteer._id);
    console.log('   Role:', volunteer.role, '\n');

    // Test the exact filter that backend uses
    const filter = {
      $or: [
        { status: 'open' },
        { status: 'matched', volunteerId: volunteer._id },
        { status: 'picked_up', volunteerId: volunteer._id }
      ]
    };

    console.log('🔍 Testing volunteer filter:');
    console.log(JSON.stringify(filter, null, 2), '\n');

    // Query donations
    const donations = await Donation.find(filter).sort({ createdAt: -1 });
    
    console.log('📦 Results:');
    console.log(`   Total donations found: ${donations.length}\n`);

    if (donations.length === 0) {
      console.log('⚠️  No donations found!');
      console.log('   Possible reasons:');
      console.log('   1. Database is empty - run: npm run seed-demo');
      console.log('   2. All donations have status other than open/matched/picked_up');
      console.log('\n   Checking all donations in database...\n');
      
      const allDonations = await Donation.find({});
      console.log(`   Total donations in DB: ${allDonations.length}`);
      
      if (allDonations.length > 0) {
        console.log('\n   Status breakdown:');
        const statusCount = {};
        allDonations.forEach(d => {
          statusCount[d.status] = (statusCount[d.status] || 0) + 1;
        });
        Object.entries(statusCount).forEach(([status, count]) => {
          console.log(`      ${status}: ${count}`);
        });
      }
    } else {
      console.log('✅ SUCCESS! Volunteer can see donations\n');
      console.log('   Status breakdown:');
      const statusCount = {};
      donations.forEach(d => {
        statusCount[d.status] = (statusCount[d.status] || 0) + 1;
      });
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`      ${status}: ${count}`);
      });

      console.log('\n   Sample donations:');
      donations.slice(0, 3).forEach((d, i) => {
        console.log(`   ${i + 1}. ${d.foodName || d.foodType}`);
        console.log(`      Status: ${d.status}`);
        console.log(`      Quantity: ${d.quantity} ${d.unit}`);
        console.log(`      Location: ${d.location?.address || 'N/A'}`);
        if (d.volunteerId) {
          console.log(`      Volunteer ID: ${d.volunteerId}`);
        }
        console.log('');
      });
    }

    await mongoose.connection.close();
    console.log('📡 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testVolunteerView();
