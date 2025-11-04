import dotenv from "dotenv"
import connectDB from "./db/index.js";
import app from "./app.js"
import { createServer } from "http";
import { Server } from "socket.io";
import { setupSocketHandlers } from "./socket/index.js";

dotenv.config({
    path: './.env'
})


const httpServer = createServer(app);

// Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        credentials: true,
        methods: ["GET", "POST"]
    }
});


app.set('io', io);


setupSocketHandlers(io);

connectDB()
    .then(() => {
        httpServer.listen(process.env.PORT || 8000, () => {
            console.log(`✅ Server is running on port ${process.env.PORT || 8000}`);
            console.log(`📡 Socket.IO server is ready`);
        })
    })
    .catch((err) => {
        console.log("❌ MongoDB connection Failed !!!", err);
    })