# 🚀 ResQAI - Setup Guide

Complete setup instructions for running ResQAI locally.

---

## 📋 Prerequisites

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** - Local installation or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account
- **Google Maps API Key** - [Get API Key](https://developers.google.com/maps/documentation/javascript/get-api-key)
- **Google Gemini API Key** - [Get API Key](https://makersuite.google.com/app/apikey)

---

## ⚡ Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/krithikananth/ResQ-AI.git
cd ResQ-AI
```

### 2. Backend Setup
```bash
cd server
npm install
```

Create `server/.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/resqai
# OR use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/resqai

JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

Seed the database:
```bash
npm run seed-demo
```

Start the backend:
```bash
npm run dev
```
Backend will run on http://localhost:5000

### 3. Frontend Setup
Open a new terminal:
```bash
cd client
npm install
```

Create `client/.env` (optional):
```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

Start the frontend:
```bash
npm run dev
```
Frontend will run on http://localhost:5173

---

## 👥 Demo Accounts

After seeding the database, use these accounts:

### Donor Account
- Email: `donor@test.com`
- Password: `test123`

### NGO Account
- Email: `ngo@test.com`
- Password: `test123`

### Volunteer Account
- Email: `volunteer@test.com`
- Password: `test123`

---

## 📁 Project Structure

```
ResQ-AI/
├── client/                # React frontend
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   └── services/     # API services
│   └── package.json
│
├── server/               # Node.js backend
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── middleware/      # Auth & validation
│   ├── mcp/            # MCP servers
│   └── scripts/        # Utility scripts
│
├── scripts/             # Setup automation
├── API_REFERENCE.md     # API documentation
├── DEMO_CREDENTIALS.md  # Test accounts
└── README.md           # Project overview
```

---

## 🔧 Configuration

### MongoDB Connection
- **Local:** `mongodb://localhost:27017/resqai`
- **Atlas:** Get connection string from MongoDB Atlas dashboard

### API Keys Required
1. **Google Maps API** - For location features
2. **Gemini AI** - For food safety assistant

### Environment Variables
See `.env.example` files in both `client/` and `server/` directories.

---

## 🧪 Testing

### Seed Demo Data
```bash
cd server
npm run seed-demo
```
Creates 15 donations and 3 user accounts.

### Reset Database
```bash
cd server
npm run reset-db
```

---

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod`
- Check connection string in `.env`
- For Atlas, whitelist your IP address

### Port Already in Use
- Backend: Change `PORT` in `server/.env`
- Frontend: Change port in `client/vite.config.js`

### API Key Errors
- Verify keys are correct in `.env`
- Check API key permissions/quotas
- Restart servers after changing `.env`

---

## 📚 Learn More

- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Demo Credentials](./DEMO_CREDENTIALS.md) - Test account details
- [Testing Guide](./TESTING_GUIDE.md) - Testing instructions

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

---

## 💬 Support

For issues or questions:
- Open an [issue](https://github.com/krithikananth/ResQ-AI/issues)
- Check existing documentation
- Review API reference

---

**Happy Coding! 🎉**
