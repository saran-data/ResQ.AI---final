import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Import routes
import authRoutes from './routes/auth.js';
import donationRoutes from './routes/donations.js';
import ngoRoutes from './routes/ngos.js';
import chatRoutes from './routes/chat.js';
import matchingRoutes from './routes/matching.js';
import mcpRoutes from './routes/mcp.js';

// Import MCP manager
import { mcpManager } from './mcp/mcpManager.js';

// Import RAG service
import ragService from './services/ragService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection with in-memory fallback
let mongoMemoryServer = null;
let usingMemoryDB = false;

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/resqai';
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected:', uri.includes('localhost') ? 'local' : 'Atlas');
  } catch (primaryError) {
    console.warn('⚠️ Primary MongoDB failed:', primaryError.message);
    // Final fallback: In-memory MongoDB
    try {
      mongoMemoryServer = await MongoMemoryServer.create();
      const memUri = mongoMemoryServer.getUri();
      await mongoose.connect(memUri);
      usingMemoryDB = true;
      console.log('✅ In-memory MongoDB started (reseed happens automatically on each start)');
    } catch (memError) {
      console.error('❌ All MongoDB options failed:', memError.message);
      process.exit(1);
    }
  }
};

// Initialize services
const initializeServices = async () => {
  try {
    // Connect to database first - this is critical
    await connectDB();

    // Seed demo data:
    // - ALWAYS seed when using in-memory DB (it's fresh every restart)
    // - Only seed when DB is truly empty for persistent DBs
    try {
      const User = (await import('./models/User.js')).default;
      const count = await User.countDocuments();
      if (count === 0 || usingMemoryDB) {
        if (count > 0 && usingMemoryDB) {
          // In-memory DB already has data from this session — skip
          console.log(`✅ In-memory DB already has ${count} users`);
        } else {
          console.log('🌱 Seeding demo data...');
          await seedInlineDemo();
        }
      } else {
        console.log(`✅ Database has ${count} users — skipping seed`);
      }
    } catch (seedErr) {
      console.warn('⚠️ Demo seeding skipped:', seedErr.message);
    }

    // Initialize RAG service - non-critical, warn on failure
    try {
      console.log('🤖 Initializing RAG service...');
      await ragService.initialize();
    } catch (ragError) {
      console.warn('⚠️ RAG service failed to initialize (chat features limited):', ragError.message);
    }
    
    // Initialize MCP servers - non-critical, warn on failure
    try {
      console.log('🔧 Initializing MCP servers...');
      await mcpManager.initialize();
    } catch (mcpError) {
      console.warn('⚠️ MCP servers failed to initialize (maps/weather/calendar limited):', mcpError.message);
    }
    
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Critical service initialization failed:', error.message);
    process.exit(1);
  }
};

/**
 * Seed demo data inline (does not call process.exit)
 */
async function seedInlineDemo() {
  const User = (await import('./models/User.js')).default;
  const NGO  = (await import('./models/NGO.js')).default;
  const Donation = (await import('./models/Donation.js')).default;

  // Store the PLAIN password — the User pre-save hook will hash it automatically
  const PASS = 'password123';

  const LOCS = [
    { lat: 13.0843, lng: 80.2072, address: 'Anna Nagar West, Chennai' },
    { lat: 13.0915, lng: 80.2163, address: 'Anna Nagar East, Chennai' },
    { lat: 13.0846, lng: 80.1827, address: 'Mogappair, Chennai' },
    { lat: 13.0804, lng: 80.2399, address: 'Kilpauk, Chennai' },
    { lat: 13.0919, lng: 80.1916, address: 'Thirumangalam, Chennai' },
  ];

  // Create donors
  const donors = await Promise.all([
    User.create({ email: 'donor1@demo.com', passwordHash: PASS, name: 'Saravana Bhavan Restaurant', phone: '+919876543210', role: 'donor', location: LOCS[0] }),
    User.create({ email: 'donor2@demo.com', passwordHash: PASS, name: 'Hotel Paradise',              phone: '+919876543211', role: 'donor', location: LOCS[1] }),
    User.create({ email: 'donor3@demo.com', passwordHash: PASS, name: 'Green Valley Caterers',       phone: '+919876543212', role: 'donor', location: LOCS[2] }),
  ]);

  // Create NGO users + profiles
  const ngoData = [
    { email: 'ngo1@demo.com', name: 'Annam Foundation',   loc: LOCS[3], reg: 'TN/2020/0001234', cap: 500 },
    { email: 'ngo2@demo.com', name: 'Feed Chennai Trust',  loc: LOCS[4], reg: 'TN/2021/0005678', cap: 300 },
    { email: 'ngo3@demo.com', name: 'Hope Foundation',     loc: LOCS[0], reg: 'TN/2019/0009012', cap: 400 },
  ];

  await Promise.all(ngoData.map(async (n) => {
    const u = await User.create({ email: n.email, passwordHash: PASS, name: n.name, phone: '+919876543220', role: 'ngo', organizationName: n.name, capacity: n.cap, location: n.loc });
    await NGO.create({ userId: u._id, organizationName: n.name, registrationNumber: n.reg, capacity: { daily: n.cap, current: 0 }, primaryContact: { name: 'Manager', phone: '+919876543220', email: n.email }, dietaryNeeds: ['any'], verificationStatus: 'verified' });
  }));

  // Create volunteers
  await Promise.all([
    User.create({ email: 'volunteer1@demo.com', passwordHash: PASS, name: 'Rajesh Kumar', phone: '+919876543230', role: 'volunteer', location: LOCS[0] }),
    User.create({ email: 'volunteer2@demo.com', passwordHash: PASS, name: 'Priya Sharma',  phone: '+919876543231', role: 'volunteer', location: LOCS[3] }),
  ]);

  // Create sample donations
  const now = new Date();
  const foods = [
    { name: 'Biryani', type: 'cooked', qty: 5, unit: 'kg', temp: 'refrigerated', hoursLeft: 8 },
    { name: 'Idli Batter', type: 'raw', qty: 10, unit: 'kg', temp: 'refrigerated', hoursLeft: 24 },
    { name: 'Basmati Rice', type: 'grains', qty: 20, unit: 'kg', temp: 'room_temp', hoursLeft: 72 },
    { name: 'Vegetable Curry', type: 'cooked', qty: 6, unit: 'kg', temp: 'refrigerated', hoursLeft: 4 },
    { name: 'Bread Loaves', type: 'packaged', qty: 50, unit: 'pieces', temp: 'room_temp', hoursLeft: 48 },
  ];

  await Promise.all(foods.map((f, i) => Donation.create({
    donorId: donors[i % donors.length]._id,
    foodType: f.type,
    foodName: f.name,
    quantity: f.qty,
    unit: f.unit,
    prepTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    storageTemp: f.temp,
    location: LOCS[i % LOCS.length],
    status: 'open',
    estimatedShelfLifeEnd: new Date(now.getTime() + f.hoursLeft * 60 * 60 * 1000),
    dietaryInfo: { isVegetarian: true, isVegan: false, isHalal: true, isKosher: false, isGlutenFree: false },
    contactPerson: 'Manager',
    contactPhone: '+919876543210',
    urgencyLevel: f.hoursLeft <= 4 ? 'critical' : f.hoursLeft <= 8 ? 'high' : 'medium',
  })));

  console.log('✅ Demo data seeded: 3 donors, 3 NGOs, 2 volunteers, 5 donations');
  console.log('   Donor logins:    donor1@demo.com / password123');
  console.log('   NGO logins:      ngo1@demo.com   / password123');
  console.log('   Volunteer login: volunteer1@demo.com / password123');
}

// Start initialization
initializeServices();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'ResQ-AI Backend',
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/mcp', mcpRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║           🍱 ResQ-AI Backend Server Started 🍱          ║  
║                                                          ║
║  📍 Server:  http://localhost:${PORT}                     ║
║  📖 Health:  http://localhost:${PORT}/health               ║
║  🌐 CORS:    ${process.env.CLIENT_URL || 'http://localhost:3000'}                      ║
║                                                          ║
║  Environment: ${process.env.NODE_ENV || 'development'}                           ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

export default app;