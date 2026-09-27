import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const resetDatabase = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB
    let mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/resqai';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Get database instance
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections`);
    
    // Drop all collections
    for (const collection of collections) {
      console.log(`🗑️ Dropping collection: ${collection.name}`);
      await db.collection(collection.name).drop();
    }
    
    console.log('✅ All collections dropped successfully');
    console.log('🔄 Database has been reset - all user accounts and data removed');
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
    process.exit(1);
  }
};

resetDatabase();