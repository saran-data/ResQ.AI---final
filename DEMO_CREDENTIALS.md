# 🎉 ResQ-AI Demo Credentials & Usage Guide

## 🌐 Application URLs

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:5001
- **API Health Check**: http://localhost:5001/health

## 🔐 Demo Login Credentials

All passwords: `password123`

### 👨‍🍳 Donors (Restaurants/Caterers)

| Email | Name | Location |
|-------|------|----------|
| donor1@gmail.com | Saravana Bhavan Restaurant | Anna Nagar West, Chennai |
| donor2@gmail.com | Hotel Paradise | Anna Nagar East, Chennai |
| donor3@gmail.com | Green Valley Caterers | Mogappair, Chennai |

**What donors can do:**
- Create food donations with details (type, quantity, expiry time)
- View their donation history
- See which NGOs matched with their donations
- Track donation status (open → matched → picked_up → delivered)

### 🏢 NGOs (Food Banks/Charities)

| Email | Name | Location | Daily Capacity |
|-------|------|----------|----------------|
| ngo1@gmail.com | Annam Foundation | Kilpauk, Chennai | 500 meals |
| ngo2@gmail.com | Feed Chennai Trust | Thirumangalam, Chennai | 300 meals |
| ngo3@gmail.com | Hope Foundation | Aminjikarai, Chennai | 400 meals |
| ngo4@gmail.com | Chennai Food Bank | Shenoy Nagar, Chennai | 600 meals |
| ngo5@gmail.com | Seva Trust | Kolathur, Chennai | 350 meals |

**What NGOs can do:**
- Browse available food donations nearby
- View donation details (food type, quantity, expiry, location)
- Accept/match donations
- See matched donations list
- View donor contact information for pickup coordination

### 🚗 Volunteers (Delivery Drivers)

| Email | Name | Location | Vehicle |
|-------|------|----------|---------|
| volunteer1@gmail.com | Rajesh Kumar | Anna Nagar, Chennai | Bike |
| volunteer2@gmail.com | Priya Sharma | Kilpauk, Chennai | Car |
| volunteer3@gmail.com | Arun Patel | Thirumangalam, Chennai | Bike |

**What volunteers can do:**
- View available pickup requests
- Accept delivery tasks
- See pickup and delivery routes
- Mark deliveries as completed
- Track delivery history

## 📦 Pre-loaded Demo Data

- **15 Donations** with various food types:
  - Cooked food (Biryani, Sambar, Vegetable Curry, Chapatis)
  - Raw food (Idli Batter, Vegetables)
  - Packaged food (Bread, Biscuits, Cakes, Juice)
  - Grains (Rice, Dal)
  - Dairy (Milk, Paneer)
  - Fruits (Apples)

- **Donation Statuses:**
  - Most are **open** (available for matching)
  - 2 are **matched** (accepted by NGO)
  - 1 is **picked_up** (volunteer collected)
  - 1 is **delivered** (completed)

- **All locations** within 5-10 km radius in Anna Nagar area, Chennai

## 🚀 Quick Start Testing Flow

### Test Scenario 1: Complete Food Rescue Cycle

1. **Login as Donor** (donor1@gmail.com / password123)
   - View dashboard with active donations
   - Click "Add Donation" to create a new food donation
   - Fill in details: food name, quantity, expiry time, location
   - Submit and see it appear in the list

2. **Login as NGO** (ngo1@gmail.com / password123)
   - View available donations list
   - See donation details with distance from your location
   - Click "Accept" on a donation to match it
   - View matched donations with donor contact info

3. **Login as Volunteer** (volunteer1@gmail.com / password123)
   - View available pickup requests
   - See donor and NGO locations
   - Accept a delivery task
   - Mark as picked up → mark as delivered

### Test Scenario 2: Browse and Filter

1. **Login as NGO** (ngo2@gmail.com / password123)
   - Browse all available donations
   - Filter by food type (cooked, packaged, etc.)
   - Sort by urgency (critical, high, medium, low)
   - Check expiry times (donations expiring within 2-12 hours)

### Test Scenario 3: Real-time Updates

1. **Open two browser windows:**
   - Window 1: Donor dashboard
   - Window 2: NGO dashboard
2. Create donation in donor window
3. See it appear immediately in NGO window (if using real-time features)

## 🗺️ Map Features

All users are located in the Anna Nagar area of Chennai:
- Anna Nagar West (13.0843, 80.2072)
- Anna Nagar East (13.0915, 80.2163)
- Mogappair (13.0846, 80.1827)
- Kilpauk (13.0804, 80.2399)
- Thirumangalam (13.0919, 80.1916)
- Aminjikarai (13.0767, 80.2213)
- Shenoy Nagar (13.0786, 80.2343)
- Kolathur (13.1298, 80.2122)

Maps use **OpenStreetMap** tiles (free) and **Leaflet** library.

## 🔧 API Keys Configuration

All API keys are already configured in `/server/.env`:

- ✅ **MongoDB Atlas**: Connected to cloud database
- ✅ **Google Gemini AI**: For RAG chatbot and food safety guidelines
- ✅ **OpenWeather API**: For weather-based delivery optimization
- ✅ **Nominatim/OSRM**: For geocoding and routing (no API key needed - free services)

## 🛠️ Tech Stack

### Frontend (Port 3001)
- React 18 + Vite
- TailwindCSS for styling
- React Router for navigation
- Axios for API calls
- Leaflet/React-Leaflet for maps
- JWT-based authentication

### Backend (Port 5001)
- Node.js + Express
- MongoDB (local fallback, Atlas ready)
- Google Gemini AI for RAG
- MCP (Model Context Protocol) servers:
  - Maps server (routing, geocoding)
  - Weather server (delivery optimization)
  - Calendar server (scheduling)
- JWT authentication
- Bcrypt password hashing

## 📊 Database Collections

- **users**: All users (donors, NGOs, volunteers) with roles
- **ngos**: NGO-specific details (registration, capacity, serving areas)
- **donations**: Food donations with location, expiry, status
- **matches**: Donation-NGO matches
- **safetydocs**: FSSAI food safety guidelines for RAG

## 🔄 Resetting Demo Data

To reset and reseed the database:

```powershell
cd server
npm run seed-demo
```

This will:
- Clear all existing users, NGOs, donations
- Create fresh demo data
- Reset all passwords to `password123`

## 📝 Notes

- All donation expiry times are set to 2-12 hours from creation time
- Urgency levels calculated based on expiry time:
  - ≤3 hours: Critical
  - 4-5 hours: High  
  - 6-8 hours: Medium
  - ≥9 hours: Low
- All contact phones: +91 9876543210 (demo number)
- All users verified and active by default
- NGOs are pre-verified with registration numbers

## 🚨 Troubleshooting

### Cannot login?
- Check backend is running on port 5001
- Verify credentials exactly: email@gmail.com / password123
- Check browser console for errors

### Donations not showing?
- Run `npm run seed-demo` again in server folder
- Check MongoDB is running
- Verify backend logs for errors

### Maps not loading?
- Check internet connection (needed for OSM tiles)
- Verify browser console for CORS errors
- Ensure ports 3001 and 5001 are not blocked

## 🎯 Next Steps

1. **Test the complete flow** using scenarios above
2. **Check maps integration** (if implemented)
3. **Test RAG chatbot** for food safety questions
4. **Try weather-based delivery optimization**
5. **Test matching algorithm** (proximity + capacity)

---

**Project Status**: ~70% Complete ✅
**Last Updated**: Demo data seeded successfully
**Database**: Local MongoDB (Atlas ready)
