# 💬 Real-Time Chat Application

A full-stack real-time 1:1 chat app with React Native (Expo) + Node.js (Express + Socket.IO) + MongoDB.

## ✨ Features

- ✅ **JWT Authentication** - Secure register/login with access & refresh tokens
- ✅ **Real-Time Messaging** - Instant message delivery via Socket.IO WebSockets
- ✅ **Typing Indicators** - See when someone is typing
- ✅ **Online/Offline Status** - Real-time presence detection with green badges
- ✅ **Read Receipts** - ✓ sent → ✓✓ delivered → ✓✓ (blue) read
- ✅ **Message Persistence** - All messages stored in MongoDB
- ✅ **Avatar Upload** - Cloudinary integration for profile pictures

## 🛠️ Tech Stack

**Frontend:** React Native (Expo), Socket.IO Client, React Navigation, Axios  
**Backend:** Node.js, Express, Socket.IO, MongoDB, Mongoose, JWT, Bcrypt  
**Storage:** MongoDB (database), Cloudinary (images)

## 📁 Project Structure

```
chat-app/
├── server/          # Backend (Node.js + Express + Socket.IO)
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── socket/
│   │   └── utils/
│   └── .env
│
└── mobile/          # Frontend (React Native + Expo)
    ├── src/
    │   ├── screens/
    │   ├── services/
    │   ├── navigation/
    │   ├── context/
    │   └── utils/
    └── App.js
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- MongoDB (local or Atlas)
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone

### 1. Backend Setup

```bash
cd server
npm install

# Create .env file with:
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chat-app
ACCESS_TOKEN_SECRET=your_secret_key_here
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_secret_here
REFRESH_TOKEN_EXPIRY=365d
CORS_ORIGIN=*
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# Start server
npm run dev
```

### 2. Mobile App Setup

```bash
cd mobile
npm install
```

**Update IP Address:**  
Find your computer's IP (`ipconfig` on Windows / `ifconfig` on Mac) and update:
- `src/services/api.js` → Line 7: `http://YOUR_IP:5000/api/v1`
- `src/services/socket.js` → Line 5: `http://YOUR_IP:5000`

```bash
# Start app
npx expo start

# Scan QR code with Expo Go app (ensure same WiFi)
```

## 🧪 Testing

### Sample Users
Create two test accounts:
- **Alice:** alice@test.com / password123
- **Bob:** bob@test.com / password123

### Test Features
1. Register both users on 2 devices
2. Login with both accounts
3. See each other in user list (green badge = online)
4. Start chat and send messages
5. Watch typing indicator when other person types
6. See ticks change: ✓ → ✓✓ → ✓✓ (blue)
7. Close and reopen app → messages persist

## 📡 API Endpoints

### REST APIs
```
POST   /api/v1/users/register        # Register user
POST   /api/v1/users/login           # Login user
POST   /api/v1/users/logout          # Logout user
POST   /api/v1/users/refresh-token   # Refresh access token
GET    /api/v1/messages/users        # Get all users
GET    /api/v1/messages/conversations/:userId/messages  # Get chat history
```

### Socket.IO Events
**Emit:**  
`message:send`, `message:read`, `typing:start`, `typing:stop`

**Listen:**  
`message:new`, `message:sent`, `message:delivered`, `message:read-receipt`, `typing:started`, `typing:stopped`, `user:online`, `user:offline`

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Network request failed | Update IP in api.js & socket.js |
| MongoDB connection error | Start MongoDB: `mongod` |
| Socket not connecting | Check backend is running on port 5000 |
| App won't load | Run `npx expo start -c` to clear cache |

## 👨‍💻 Author

**Akhil Raj**  
📧 532akhil@gmail.com  
🔗 [LinkedIn](https://www.linkedin.com/in/akhil-raj-6b38b62a5/) | [GitHub](https://github.com/Akhil-Raj59)

## 📄 License

Created for Vedaz internship assignment.