import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { messageAPI } from '../services/api';
import socketService from '../services/socket';

const UserListScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const { logout, user } = useAuth();

  useEffect(() => {
    fetchData();
    setupSocketListeners();

    return () => {
      // Socket listeners managed by service
    };
  }, []);

  const setupSocketListeners = () => {
    // Listen for users coming online
    if (socketService.onUserOnline) {
      socketService.onUserOnline(({ userId }) => {
        setOnlineUsers(prev => new Set([...prev, userId]));
      });
    }

    // Listen for users going offline
    if (socketService.onUserOffline) {
      socketService.onUserOffline(({ userId }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      });
    }

    // Get initial online users
    if (socketService.onUsersOnline) {
      socketService.onUsersOnline(({ userIds }) => {
        if (userIds && Array.isArray(userIds)) {
          setOnlineUsers(new Set(userIds));
        }
      });
    }

    // Listen for new messages to update last message
    if (socketService.onNewMessage) {
      socketService.onNewMessage(({ message }) => {
        if (message) {
          setConversations(prev => ({
            ...prev,
            [message.sender._id]: {
              content: message.content,
              createdAt: message.createdAt,
              senderId: message.sender._id
            }
          }));
        }
      });
    }

    // Listen for sent messages
    if (socketService.onMessageSent) {
      socketService.onMessageSent(({ message }) => {
        if (message) {
          setConversations(prev => ({
            ...prev,
            [message.receiver]: {
              content: message.content,
              createdAt: message.createdAt,
              senderId: message.sender._id
            }
          }));
        }
      });
    }
  };

  const fetchData = async () => {
    try {
      // Fetch all users
      const usersResponse = await messageAPI.getUsers();
      const fetchedUsers = usersResponse.data.data || [];
      setUsers(fetchedUsers);
      
      // Set initial online status
      const online = new Set(
        fetchedUsers.filter(u => u.isOnline).map(u => u._id)
      );
      setOnlineUsers(online);

      // Fetch conversations to get last messages
      const conversationsResponse = await messageAPI.getConversations();
      const conversationsData = conversationsResponse.data.data || [];
      
      // Create a map of userId -> lastMessage
      const conversationsMap = {};
      conversationsData.forEach(conv => {
        conversationsMap[conv.userId] = conv.lastMessage;
      });
      setConversations(conversationsMap);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleUserPress = (selectedUser) => {
    navigation.navigate('Chat', {
      userId: selectedUser._id,
      userName: selectedUser.fullName,
      userAvatar: selectedUser.avatar,
    });
  };

  const getLastMessage = (userId) => {
    const conversation = conversations[userId];
    if (!conversation || !conversation.content) {
      return 'Tap to start chatting';
    }
    
    const isMyMessage = conversation.senderId === user._id;
    const prefix = isMyMessage ? 'You: ' : '';
    return prefix + conversation.content;
  };

  const getLastMessageTime = (userId) => {
    const conversation = conversations[userId];
    if (!conversation || !conversation.createdAt) return '';
    
    const messageDate = new Date(conversation.createdAt);
    const now = new Date();
    const diffMs = now - messageDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d`;
    
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderUser = ({ item }) => {
    const isOnline = onlineUsers.has(item._id);
    const lastMessage = getLastMessage(item._id);
    const messageTime = getLastMessageTime(item._id);

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleUserPress(item)}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          {isOnline && <View style={styles.onlineBadge} />}
        </View>

        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <Text style={styles.userName}>{item.fullName}</Text>
            {messageTime ? (
              <Text style={styles.timeText}>{messageTime}</Text>
            ) : null}
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMessage}
          </Text>
        </View>

        <View style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ====== Header ====== */}
      <View style={styles.header}>
        <View style={styles.userHeaderLeft}>
          <Image
            source={{ uri: user?.avatar }}
            style={styles.userHeaderAvatar}
          />
          <View>
            <Text style={styles.userHeaderName}>
              {user?.fullName || 'User'}
            </Text>
            <Text style={styles.userHeaderSubtext}>Messages</Text>
          </View>
        </View>

        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* ====== User List ====== */}
      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={renderUser}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  userHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userHeaderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#ddd',
    borderWidth: 2,
    borderColor: '#0066cc',
  },
  userHeaderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userHeaderSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
  },
  logoutText: {
    color: '#0066cc',
    fontSize: 15,
    fontWeight: '600',
  },
  list: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ddd',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  arrow: {
    marginLeft: 8,
  },
  arrowText: {
    fontSize: 28,
    color: '#ccc',
    fontWeight: '300',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
  },
});

export default UserListScreen;