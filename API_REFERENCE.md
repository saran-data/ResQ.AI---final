# 📖 ResQAI API Reference

Base URL: `http://localhost:5000/api`

All requests (except Auth) require header:
```
Authorization: Bearer {token}
Content-Type: application/json
```

---

## 🔐 Authentication

### Register New User
```
POST /auth/register

Request:
{
  "name": "John Donor",
  "email": "john@restaurant.com",
  "password": "secure123",
  "role": "donor",              // "donor" | "ngo" | "volunteer" | "admin"
  "phone": "+91 9876543210"
}

Response: 201 Created
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Donor",
    "email": "john@restaurant.com",
    "role": "donor"
  }
}

Errors:
- 400: Missing required fields
- 409: Email already registered
- 500: Server error
```

### Login
```
POST /auth/login

Request:
{
  "email": "john@restaurant.com",
  "password": "secure123"
}

Response: 200 OK
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Donor",
    "email": "john@restaurant.com",
    "role": "donor"
  }
}

Errors:
- 400: Email or password required
- 401: Invalid email or password
- 500: Server error
```

---

## 👥 Donors

### Get All Donors
```
GET /donors

Response: 200 OK
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Pizza Palace",
      "email": "contact@pizzapalace.com",
      "phone": "+91 9876543210",
      "role": "donor",
      "location": {
        "lat": 28.6139,
        "lng": 77.2090,
        "address": "Connaught Place, Delhi",
        "city": "Delhi"
      },
      "verified": true,
      "isActive": true
    }
  ]
}
```

### Get Donor Profile
```
GET /donors/:id

Response: 200 OK
{ "success": true, "data": { ...donor } }

Errors:
- 404: Donor not found
```

### Update Donor Profile
```
PUT /donors/:id
Authorization required

Request:
{
  "name": "Pizza Palace Updated",
  "phone": "+91 9999999999",
  "location": {
    "lat": 28.6139,
    "lng": 77.2090,
    "address": "New Address, Delhi",
    "city": "Delhi"
  }
}

Response: 200 OK
{
  "success": true,
  "message": "Profile updated",
  "data": { ...updated_donor }
}

Errors:
- 403: Access denied (not your profile)
- 404: Donor not found
```

---

## 🏢 NGOs

### Get All NGOs
```
GET /ngos

Response: 200 OK
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "userId": "507f1f77bcf86cd799439001",
      "organizationName": "Food for All Foundation",
      "registrationNumber": "NGO/2020/00123",
      "cause": ["food_security", "homeless"],
      "location": {
        "lat": 28.5355,
        "lng": 77.3910,
        "address": "Noida, UP",
        "operatingRadius": 50
      },
      "capacity": {
        "maxDailyRecipients": 500,
        "maxFoodQuantityKg": 1000,
        "storageTemperature": "cold"
      },
      "dietaryRestrictions": ["vegan", "gluten-free"],
      "pickupAvailability": [
        {
          "day": "Monday",
          "startTime": "10:00",
          "endTime": "18:00"
        }
      ],
      "verified": true,
      "rating": 4.8
    }
  ]
}
```

### Get NGO by ID
```
GET /ngos/:id

Response: 200 OK
{ "success": true, "data": { ...ngo } }
```

### Create NGO Profile
```
POST /ngos
Authorization required

Request:
{
  "organizationName": "Food for All Foundation",
  "registrationNumber": "NGO/2020/00123",
  "cause": ["food_security", "homeless"],
  "location": {
    "lat": 28.5355,
    "lng": 77.3910,
    "address": "Noida, UP",
    "operatingRadius": 50
  },
  "capacity": {
    "maxDailyRecipients": 500,
    "maxFoodQuantityKg": 1000,
    "storageTemperature": "cold"
  },
  "dietaryRestrictions": ["vegan", "gluten-free"],
  "pickupAvailability": [
    {
      "day": "Monday",
      "startTime": "10:00",
      "endTime": "18:00"
    }
  ]
}

Response: 201 Created
{ "success": true, "message": "NGO profile created", "data": { ...ngo } }
```

### Update NGO Profile
```
PUT /ngos/:id
Authorization required

Request: Same as Create (partial fields allowed)

Response: 200 OK
{ "success": true, "message": "NGO profile updated", "data": { ...ngo } }
```

---

## 🍱 Donations

### Create Donation
```
POST /donations
Authorization required

Request:
{
  "foodItems": [
    {
      "name": "Biryani",
      "quantity": 10,
      "unit": "kg",
      "category": "cooked",
      "dietaryInfo": ["vegan"],
      "perishable": true,
      "shelfLife": 4,
      "expiresAt": "2026-09-09T10:00:00Z"
    }
  ],
  "pickupLocation": {
    "lat": 28.6139,
    "lng": 77.2090,
    "address": "Connaught Place, Delhi",
    "city": "Delhi"
  },
  "availableFrom": "2026-09-08T18:00:00Z",
  "availableUntil": "2026-09-09T10:00:00Z",
  "photos": ["url1", "url2"],
  "safetyNotes": "Stored in cold storage"
}

Response: 201 Created
{
  "success": true,
  "message": "Donation listed successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "donorId": "507f1f77bcf86cd799439011",
    "foodItems": [...],
    "totalQuantity": 10,
    "status": "listed",
    "createdAt": "2026-09-08T18:00:00Z"
  }
}
```

### Get All Donations
```
GET /donations?status=listed&city=Delhi

Query Parameters:
- status: "listed" | "matched" | "picked_up" | "delivered" | "expired"
- city: Filter by city

Response: 200 OK
{
  "success": true,
  "count": 2,
  "data": [ ...donations ]
}
```

### Get Donation by ID
```
GET /donations/:id

Response: 200 OK
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "donorId": { ...donor_details },
    "matchedNGO": { ...ngo_details },
    ...
  }
}
```

### Update Donation Status
```
PATCH /donations/:id/status
Authorization required

Request:
{
  "status": "matched"
}

Valid statuses: "listed" | "matched" | "picked_up" | "delivered" | "expired" | "cancelled"

Response: 200 OK
{
  "success": true,
  "message": "Status updated to matched",
  "data": { ...updated_donation }
}
```

---

## 🎯 Matching (AI Algorithm)

### Find Best NGO Matches
```
POST /matching/:donationId/find-matches
Authorization required

Request: (empty body)

Response: 200 OK
{
  "success": true,
  "donation_id": "507f1f77bcf86cd799439020",
  "matches": [
    {
      "ngoId": "507f1f77bcf86cd799439012",
      "organizationName": "Food for All Foundation",
      "cause": ["food_security"],
      "distance": 12.5,
      "rating": 4.8,
      "matchScore": 92,
      "scoreBreakdown": {
        "distance": 95,
        "capacity": 100,
        "dietary": 90,
        "availability": 85
      },
      "isInRange": true,
      "hasCapacity": true
    },
    { ... more matches ... }
  ],
  "totalNGOsEvaluated": 15,
  "matchAlgorithm": "multi-criteria (distance, capacity, dietary, availability)"
}
```

### Get AI Recommendation
```
POST /matching/:donationId/recommend
Authorization required

Request: (empty body)

Response: 200 OK
{
  "success": true,
  "donation_id": "507f1f77bcf86cd799439020",
  "recommendedNGO": { ...top_match },
  "alternativeMatches": [ ...top_3_matches ]
}
```

---

## 🤖 RAG (Food Safety AI)

### Query Food Safety Knowledge Base
```
POST /rag/query

Request:
{
  "question": "Can I donate cooked biryani after 8 hours at room temperature?"
}

Response: 200 OK
{
  "success": true,
  "question": "Can I donate cooked biryani after 8 hours at room temperature?",
  "answer": "ANSWER: No, cooked food should not be donated after 2 hours at room temperature according to FSSAI guidelines...\nCONFIDENCE: HIGH\nSOURCE: FSSAI Food Safety Guidelines - Cooked Food Storage",
  "model": "claude-3-5-sonnet-20241022",
  "tokensUsed": 342
}

Errors:
- 400: Question required
- 500: RAG service not configured (no API key)
```

### Assess Donation Safety
```
POST /rag/assess/:donationId
Authorization required

Request: (empty body)

Response: 200 OK
{
  "success": true,
  "donation_id": "507f1f77bcf86cd799439020",
  "assessment": {
    "SAFE_TO_DONATE": "YES",
    "SHELF_LIFE_HOURS": 4,
    "STORAGE_TEMP": "cold",
    "WARNINGS": "Ensure cold chain maintained during transport",
    "CONFIDENCE_SCORE": 95
  }
}

Errors:
- 404: Donation not found
- 500: RAG service not configured
```

---

## 🗺️ MCP Services (Maps, Weather, Calendar)

### Geocode Address
```
POST /mcp/geocode

Request:
{
  "address": "Connaught Place, Delhi"
}

Response: 200 OK
{
  "success": true,
  "lat": 28.6139,
  "lng": 77.2090,
  "address": "Connaught Place, New Delhi, Delhi 110001, India"
}

Errors:
- 400: Address required
- 404: Address not found
```

### Calculate Route
```
POST /mcp/route

Request:
{
  "waypoints": [
    { "lat": 28.6139, "lng": 77.2090 },
    { "lat": 28.5355, "lng": 77.3910 }
  ]
}

Response: 200 OK
{
  "success": true,
  "distance": 23,
  "duration": 45,
  "geometry": "polyline_encoded_string",
  "waypoints": [ ...input_waypoints ]
}

Errors:
- 400: Need at least 2 waypoints
- 500: OSRM routing failed
```

### Get Weather
```
GET /mcp/weather/:lat/:lng

Example: GET /mcp/weather/28.6139/77.2090

Response: 200 OK
{
  "success": true,
  "temp": 28.5,
  "feelsLike": 32.1,
  "humidity": 65,
  "description": "partly cloudy",
  "windSpeed": 8.5,
  "recommendedStorageTemp": "COLD (4-8°C recommended)"
}

Errors:
- 400: Lat/lng required
- 500: Weather API key not configured
```

### Check NGO Availability
```
POST /mcp/availability
Authorization required

Request:
{
  "ngoId": "507f1f77bcf86cd799439012",
  "proposedPickupTime": "2026-09-09T10:30:00Z"
}

Response: 200 OK
{
  "success": true,
  "available": true,
  "availableSlot": {
    "day": "Wednesday",
    "startTime": "10:00",
    "endTime": "18:00"
  },
  "reason": "NGO available at this time"
}

Errors:
- 400: ngoId and proposedPickupTime required
- 404: NGO not found
```

### Optimize Pickup (Full Pipeline)
```
POST /mcp/optimize-pickup/:donationId/:ngoId
Authorization required

Request: (empty body)

Response: 200 OK
{
  "success": true,
  "optimizedPickup": {
    "donation_id": "507f1f77bcf86cd799439020",
    "ngo_id": "507f1f77bcf86cd799439012",
    "route": {
      "distance": 23,
      "duration": 45,
      "estimatedCost": 115
    },
    "weather": {
      "temp": 28.5,
      "recommendedStorageTemp": "COLD (4-8°C recommended)"
    },
    "availability": {
      "available": true,
      "reason": "NGO available at this time"
    },
    "recommendedTime": "2026-09-08T20:00:00Z"
  }
}
```

---

## 📊 Response Format

All responses follow this format:

**Success (2xx)**:
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

**Error (4xx/5xx)**:
```json
{
  "success": false,
  "error": {
    "status": 404,
    "message": "Resource not found",
    "type": "not_found_error"
  }
}
```

---

## 🔑 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized (no token) |
| 403 | Forbidden (access denied) |
| 404 | Not Found |
| 409 | Conflict (e.g., email exists) |
| 500 | Server Error |

---

## 📝 Example Workflow

**1. Register as Donor**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pizza Palace",
    "email": "pizza@local.com",
    "password": "secure123",
    "role": "donor",
    "phone": "+91 9876543210"
  }'
# Returns: token
```

**2. List Food Donation**
```bash
curl -X POST http://localhost:5000/api/donations \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "foodItems": [{"name": "Biryani", "quantity": 10, "unit": "kg", "perishable": true, "shelfLife": 4}],
    "pickupLocation": {"lat": 28.6139, "lng": 77.2090, "address": "Delhi", "city": "Delhi"},
    "availableFrom": "2026-09-08T18:00:00Z",
    "availableUntil": "2026-09-09T10:00:00Z"
  }'
# Returns: donationId
```

**3. Find NGO Matches**
```bash
curl -X POST http://localhost:5000/api/matching/{donationId}/find-matches \
  -H "Authorization: Bearer {token}"
# Returns: top 5 NGO matches scored by algorithm
```

**4. Assess Safety**
```bash
curl -X POST http://localhost:5000/api/rag/assess/{donationId} \
  -H "Authorization: Bearer {token}"
# Returns: food safety assessment from Claude RAG
```

**5. Optimize Route**
```bash
curl -X POST http://localhost:5000/api/mcp/optimize-pickup/{donationId}/{ngoId} \
  -H "Authorization: Bearer {token}"
# Returns: full logistics optimization (route + weather + availability)
```

---

Done! Use this reference to build integrations, test endpoints, and understand the full API surface. 🚀
