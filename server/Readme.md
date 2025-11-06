

# 🗨️ Real-Time Chat App Backend

A Node.js + Express + Socket.IO backend for a 1:1 real-time chat app with JWT authentication and MongoDB.

## 🚀 Features

* JWT-based Register/Login
* Real-time 1:1 chat via Socket.IO
* Online/Offline status
* Message persistence in MongoDB
* Typing indicator & read receipts

## 🛠️ Tech Stack

* **Node.js** + **Express.js**
* **MongoDB** + **Mongoose**
* **Socket.IO**
* **JWT Authentication**

## 📦 Setup

```bash
git clone <repo-url>
cd server
npm install
```

Create a `.env` file:

```
PORT=5000
MONGO_URI=<your_mongodb_uri>
JWT_SECRET=<your_secret>
```

Run the server:

```bash
npm start
```

## 📡 API Endpoints


POST /api/auth/register
POST /api/auth/login
GET  /api/users
GET  /api/conversations/:id/messages


## ⚡ Socket Events


message:send     → Send message
message:new      → Receive message
typing:start|stop → Typing indicator
message:read     → Mark message as read
