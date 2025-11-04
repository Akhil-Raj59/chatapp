import { io } from 'socket.io-client';
import { storage } from '../utils/storage';

const SOCKET_URL = 'http://192.168.51.56:5000'; 

class SocketService {
  socket = null;
  
  async connect() {
    const token = await storage.getAccessToken();
    
    if (!token) {
      console.log('No token found, cannot connect socket');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendMessage(receiverId, content) {
    if (this.socket) {
      this.socket.emit('message:send', { receiverId, content });
    }
  }

  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('message:new', callback);
    }
  }

  onMessageSent(callback) {
    if (this.socket) {
      this.socket.on('message:sent', callback);
    }
  }

  onMessageDelivered(callback) {
    if (this.socket) {
      this.socket.on('message:delivered', callback);
    }
  }

  onMessageRead(callback) {
    if (this.socket) {
      this.socket.on('message:read-receipt', callback);
    }
  }

  markAsRead(messageId, senderId) {
    if (this.socket) {
      this.socket.emit('message:read', { messageId, senderId });
    }
  }

  startTyping(receiverId) {
    if (this.socket) {
      this.socket.emit('typing:start', { receiverId });
    }
  }

  stopTyping(receiverId) {
    if (this.socket) {
      this.socket.emit('typing:stop', { receiverId });
    }
  }

  onTypingStart(callback) {
    if (this.socket) {
      this.socket.on('typing:started', callback);
    }
  }

  onTypingStop(callback) {
    if (this.socket) {
      this.socket.on('typing:stopped', callback);
    }
  }

  onUserOnline(callback) {
    if (this.socket) {
      this.socket.on('user:online', callback);
    }
  }

  onUserOffline(callback) {
    if (this.socket) {
      this.socket.on('user:offline', callback);
    }
  }

  onUsersOnline(callback) {
    if (this.socket) {
      this.socket.on('users:online', callback);
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export default new SocketService();