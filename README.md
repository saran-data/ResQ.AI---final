# 🍱 ResQAI - AI-Powered Food Rescue & Distribution Platform

## Overview

**ResQAI** is an intelligent platform that connects food donors (restaurants, hotels, canteens) with NGOs, shelters, and volunteers to intelligently rescue surplus food and close the gap between edible surplus and food insecurity.

### Core Problem Solved
- ❌ **Before**: Surplus food wasted while NGOs face shortages (manual, slow, unintelligent coordination)
- ✅ **After**: AI-powered matching, safety verification, and route optimization in real-time

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend (Vite)                      │
│            Donor | NGO/Shelter | Volunteer Dashboards             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/REST API
┌──────────────────────────▼──────────────────────────────────────┐
│                  Node.js/Express Backend                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Auth Routes  │  │RAG Assistant │  │ MCP Services │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Donations    │  │ Matching Algo│  │ Route Optim. │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ 
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
    ┌────────┐        ┌─────────┐        ┌────────┐
    │MongoDB │        │Anthropic│        │ Free   │
    │(App)   │        │Claude   │        │ APIs   │
    │        │        │RAG      │        │ (Maps, │
    └────────┘        └─────────┘        │Weather)│
                                         └────────┘
```

### Three Core AI Components

#### 1. **RAG-Based Safety Assistant** 🔒
- Grounds food-safety Q&A in real FSSAI/WHO regulatory documents
- Prevents hallucination via retrieval
- Assesses donation safety before matching

#### 2. **MCP-Integrated Logistics** 🗺️
- **Maps**: OpenStreetMap + Nominatim (free, no key)
- **Weather**: OpenWeather API (1000 calls/day free)
- **Calendar**: Check NGO availability windows
- **Routing**: OSRM (Open Source Routing Machine) - free

#### 3. **Optimization-Based Matching** 🎯
- Multi-criteria weighted algorithm
- Factors: distance (40%), capacity (30%), dietary (20%), availability (10%)
- Haversine distance calculation
- Returns top 5 matches ranked by score

---

## 📋 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite | User dashboards & forms |
| **Backend** | Node.js + Express | REST API, business logic |
| **Database** | MongoDB (local/Atlas) | Users, donations, NGOs |
| **LLM** | Anthropic Claude | RAG + food safety assessment |
| **External APIs** | Nominatim, OSRM, OpenWeather | Maps, routing, weather |

---

## 🚀 Quick Start (Local Server)

### Prerequisites
- **Node.js** v16+ 
- **MongoDB** running (local or Atlas)
- **Anthropic API Key** (optional, for RAG features)

### 1️⃣ Clone & Install

```bash
cd c:\Users\Krithik Ananth\Desktop\projects\ResQ-AI

# Backend
cd backend-nodejs
npm install

# Frontend
cd ../frontend-react
npm install
```

### 2️⃣ Configure Environment

**Backend** - Create `.env` in `backend-nodejs/`:
```bash
PORT=5000
NODE_ENV=development

# LLM Provider Options:
# Option A: Use Ollama (FREE, local, recommended for capstone)
PROVIDER=ollama
OLLAMA_MODEL=mistral

# Option B: Use Claude API (requires API key)
# PROVIDER=claude
# CLAUDE_API_KEY=sk-...

# Option C: Use Google Gemini (requires API key)
# PROVIDER=gemini
# GEMINI_API_KEY=...

# Database
MONGODB_URI=mongodb://localhost:27017/resq_ai_db
MONGODB_URI=mongodb://localhost:27017/resqai
JWT_SECRET=your-super-secret-key-min-32-chars
ANTHROPIC_API_KEY=sk-ant-your-key-here
FRONTEND_URL=http://localhost:3000
```

**Frontend** - Already configured to proxy `/api` to `localhost:5000`

### 3️⃣ Setup LLM: Ollama (Optional but Recommended)

**Why Ollama?**
- ✅ FREE (no API costs)
- ✅ Local (private data)
- ✅ Offline (no internet needed)
- ✅ Fast setup (2 minutes)
- ✅ Best for capstone demo

**Quick Setup:**

1. **Download Ollama** from https://ollama.ai/download
2. **Install** and run `OllamaSetup.exe`
3. **Download Mistral model:**
   ```bash
   ollama pull mistral
   ```
4. **Start Ollama service** (keep running):
   ```bash
   ollama serve
   ```
5. **That's it!** Backend auto-detects and uses it

**Or use batch script:**
```bash
cd c:\Users\Krithik Ananth\Desktop\projects\ResQ-AI
setup_ollama.bat  # Automates all of the above
```

**For more details:** See `OLLAMA_SETUP.md` and `OLLAMA_QUICK_START.txt`

### 4️⃣ Start Services

**Terminal 1 - Backend:**
```bash
cd backend-nodejs
npm start
# Server ready at http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend-react
npm run dev
# App ready at http://localhost:3000
```

### 5️⃣ Access Platform

Open browser: **http://localhost:3000**

**Demo Credentials:**
- 📧 `donor@test.com` | 🔑 `password123` (Donor account)
- 📧 `ngo@test.com` | 🔑 `password123` (NGO account)
- 📧 `volunteer@test.com` | 🔑 `password123` (Volunteer account)

---

## 🆓 Free APIs Integrated

### Maps & Geocoding
| API | Free Tier | Purpose | No Key Needed? |
|-----|-----------|---------|---|
| **Nominatim (OSM)** | Unlimited | Address → Lat/Lng | ✅ Yes |
| **OSRM** | Unlimited | Route optimization | ✅ Yes |
| **Google Maps** | 1000 req/day | Alternative (optional) | ❌ Need key |

### Weather
| API | Free Tier | Purpose |
|-----|-----------|---------|
| **OpenWeather** | 1000 calls/day | Temperature, humidity, storage recommendation |

### Calendar (Built-in)
- NGO availability schedules stored in MongoDB
- Simple day/time matching logic

### LLM (Claude RAG)
- **Paid but essential** for food-safety verification
- ~$0.01 per query at standard rates
- Can be replaced with open-source LLM (Ollama) for free

---

## 📖 API Endpoints

### Authentication
```
POST /api/auth/register
POST /api/auth/login
```

### Donations
```
GET  /api/donations              # List all donations
POST /api/donations              # Create donation
GET  /api/donations/:id          # Get donation detail
PATCH /api/donations/:id/status  # Update status
```

### Matching
```
POST /api/matching/:donationId/find-matches    # Find top 5 NGO matches
POST /api/matching/:donationId/recommend       # Get single recommendation
```

### RAG (Food Safety)
```
POST /api/rag/query              # Ask food-safety question
POST /api/rag/assess/:donationId # Assess donation safety
```

### MCP (Logistics)
```
POST /api/mcp/geocode                                  # Address → coordinates
POST /api/mcp/route                                    # Calculate route
GET  /api/mcp/weather/:lat/:lng                       # Get weather
POST /api/mcp/availability                            # Check NGO availability
POST /api/mcp/optimize-pickup/:donationId/:ngoId      # Full optimization
```

---

## 💡 How It Works (9-Step Lifecycle)

1. **Donor lists food** → POST `/api/donations` with food items, location, shelf-life
2. **Gateway validates** → Check food items, location, time window
3. **RAG assesses safety** → POST `/api/rag/assess/:donationId` (Claude)
4. **Matching algorithm runs** → POST `/api/matching/:donationId/find-matches`
   - Calculate distance (Haversine)
   - Check capacity
   - Match dietary needs
   - Verify availability
5. **Top 5 matches returned** → Ranked by composite score
6. **MCP logistics optimizes** → POST `/api/mcp/optimize-pickup/:donationId/:ngoId`
   - Get route via OSRM
   - Check weather conditions
   - Verify NGO availability window
7. **NGO confirms pickup** → PATCH `/api/donations/:id/status` → `matched`
8. **Volunteer executes** → Pick up from donor, deliver to NGO
9. **Record completion** → PATCH `/api/donations/:id/status` → `delivered`

---

## 🧪 Testing the Platform

### Test Scenario: Donor Lists Food → NGO Receives Matches

**Step 1: Register & Login (Frontend)**
- Go to http://localhost:3000
- Click "Register" → Role: "Donor"
- Fill: name, email, password, phone
- Click "Login"

**Step 2: List Donation**
- Tab: "📋 List Donation"
- Enter: Food name (e.g., "Biryani"), Quantity (10), Unit (kg), Address
- Click "✓ List Donation"

**Step 3: Find Matches**
- Tab: "📦 My Donations"
- Click "🎯 Find NGOs" on your donation
- See top 5 matches scored by AI algorithm

**Step 4: Ask Safety Question**
- Tab: "🤖 Food Safety AI"
- Click "💬 Ask a Question"
- Ask: "Can I donate cooked biryani after 8 hours?"
- Get RAG-grounded answer from Claude

---

## 🗂️ Project Structure

```
ResQ-AI/
├── backend-nodejs/
│   ├── server.js                    # Express app entry
│   ├── routes/
│   │   ├── auth.js                  # Login/Register
│   │   ├── donations.js             # Donation CRUD
│   │   ├── matching.js              # NGO matching algorithm
│   │   ├── rag.js                   # Food safety Q&A
│   │   └── mcp.js                   # Maps/Weather/Calendar
│   ├── services/
│   │   ├── matchingService.js       # Scoring logic
│   │   ├── ragService.js            # Claude integration
│   │   └── mcpService.js            # External API calls
│   ├── models/
│   │   ├── User.js                  # Users (auth)
│   │   ├── Donation.js              # Food donations
│   │   └── NGO.js                   # NGO profiles
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification
│   │   └── errorHandler.js          # Global error handling
│   └── package.json
│
├── frontend-react/
│   ├── src/
│   │   ├── App.jsx                  # Main component
│   │   ├── api.js                   # Axios API client
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx         # Login/Register
│   │   │   └── Dashboard.jsx        # Main dashboard (all roles)
│   │   └── index.css
│   ├── vite.config.js               # Vite + proxy config
│   └── package.json
│
└── README.md                         # This file
```

---

## 🔧 Customization & Extension

### Add Your Own API Keys

**Google Maps** (for better routing):
1. Get key from [Google Cloud Console](https://console.cloud.google.com/)
2. Add to `.env`: `GOOGLE_MAPS_API_KEY=your-key`
3. Update `mcpService.js` to use Google Maps instead of Nominatim

**OpenWeather** (weather data):
1. Get free key from [openweathermap.org](https://openweathermap.org/api)
2. Add to `.env`: `OPENWEATHER_API_KEY=your-key`
3. Already integrated in `mcpService.js`

### Replace Claude with Open-Source LLM

**Use Ollama locally** (free):
```bash
# Install Ollama: https://ollama.ai
# Pull Llama 2: ollama pull llama2
# In ragService.js, replace Anthropic client with Ollama endpoint
```

### Add MongoDB Atlas (Cloud)

Instead of local MongoDB:
```bash
# .env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/resqai
```

---

## 🚨 Troubleshooting

### "MongoDB connection failed"
- **Solution**: Ensure MongoDB is running locally or check Atlas credentials in `.env`
- Donations will still work with in-memory storage as fallback

### "RAG query failed: No API key"
- **Solution**: Add `ANTHROPIC_API_KEY` to `.env` in backend
- Fallback: Mock responses work without key for testing

### "Frontend can't reach backend"
- **Solution**: Backend must be running on `localhost:5000`
- Check: `curl http://localhost:5000/health`

### "CORS error"
- **Solution**: Already configured in Express via `cors()` middleware
- Check frontend `.env` has `VITE_API_URL=http://localhost:5000`

---

## 📊 Algorithm Details

### Matching Score Calculation

```javascript
Score = 100 - (Distance×40% + CapacityGap×30% + DietaryConflict×20% + Unavailability×10%)

Example for Donation (10kg Biryani, Downtown):
- NGO A: 5km away, has capacity, no dietary issues, available
  → Distance: 95/100 | Capacity: 100/100 | Dietary: 100/100 | Availability: 100/100
  → Final Score: 100 - (5 + 0 + 0 + 0) = 95 ✅

- NGO B: 50km away, over capacity, vegan-only
  → Distance: 0/100 | Capacity: 20/100 | Dietary: 75/100 | Availability: 100/100
  → Final Score: 100 - (40 + 21 + 5 + 0) = 34 ❌
```

### Distance Calculation (Haversine Formula)
- Accurate to ~0.5% over typical delivery distances
- No external dependency needed
- Works offline

---

## 📚 Literature & References

This project is grounded in peer-reviewed research:

1. **Sanyal et al. (2023)** - "Sustainable Food Waste Management via Incentive Schemes"
   - Addresses volunteer travel distance (our route optimization covers this)
   
2. **Alhindi et al. (2021)** - "VRP with Time Windows for Food Donation"
   - Our matching algorithm incorporates time-window constraints

3. **IEEE & Springer Papers** on RAG, food safety, and AI-driven matching

---

## 🎯 Features Implemented

✅ User authentication (JWT)
✅ Donation listing & status tracking
✅ AI-powered NGO matching (multi-criteria)
✅ RAG-grounded food safety Q&A
✅ MCP integration (Maps, Weather, Calendar)
✅ Route optimization
✅ Role-based dashboards (Donor, NGO, Volunteer)
✅ MongoDB persistence
✅ Error handling & validation
✅ CORS & security middleware

---

## 🚧 Future Work (Out of Scope - Capstone)

- ❌ Image-based freshness detection (ML model needed)
- ❌ Demand forecasting (time-series data needed)
- ❌ Fraud detection (complex scoring system)
- ❌ Real-time notifications (WebSocket)
- ❌ Payment integration
- ❌ Mobile app (native)

---

## 📞 Support & Questions

For issues or questions:
1. Check **Troubleshooting** section above
2. Review API endpoint documentation
3. Check console logs in browser/terminal
4. Ensure both servers are running on correct ports

---

## 📄 License

MIT License - Free to use and modify

---

## 🎓 How This Addresses Your Capstone

**Problem**: Food waste + food insecurity + manual coordination = inefficiency

**Solution (ResQAI)**:
1. ✅ **RAG Component** - Grounds safety Q&A in regulatory docs (defends against hallucination)
2. ✅ **MCP Component** - Standardized tool layer for external services (Maps, Weather, Calendar)
3. ✅ **Optimization Component** - Multi-criteria matching + route optimization (directly addresses Sanyal et al. limitation)

**Scope**: 
- Deliberately focused on 3 core AI components (not overextended)
- Each component defensible with literature backing
- Can be completed & deployed in capstone timeline

---

**Ready to deploy?** 🚀

```bash
# Terminal 1
cd backend-nodejs && npm start

# Terminal 2
cd frontend-react && npm run dev

# Open http://localhost:3000
```

Enjoy building the future of food rescue! 🍱✨
