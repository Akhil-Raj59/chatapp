import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Keyboard,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { messageAPI } from '../services/api';
import socketService from '../services/socket';

const ChatScreen = ({ route, navigation }) => {
  const { userId, userName, userAvatar } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    setupSocketListeners();
    setupKeyboardListeners();

    // Update header with online status
    updateHeaderTitle();

    return () => {
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Stop typing when leaving chat
      if (socketService.stopTyping) {
        socketService.stopTyping(userId);
      }
      // Remove socket listeners (but keep them for other screens)
      cleanupSocketListeners();
    };
  }, []);

  useEffect(() => {
    updateHeaderTitle();
  }, [isOnline, isTyping]);

  const setupKeyboardListeners = () => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        scrollToBottom();
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  };

  const updateHeaderTitle = () => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerContainer}>
          <View style={styles.headerAvatarContainer}>
            <Image
              source={{ uri: userAvatar }}
              style={styles.headerAvatar}
            />
            {isOnline && <View style={styles.headerOnlineBadge} />}
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName}>{userName}</Text>
            <Text style={styles.headerStatus}>
              {isTyping ? 'typing...' : isOnline ? 'online' : 'offline'}
            </Text>
          </View>
        </View>
      ),
    });
  };

  const fetchMessages = async () => {
    try {
      const response = await messageAPI.getMessages(userId);
      const fetchedMessages = response.data.data || [];
      setMessages(fetchedMessages);
      
      // Mark unread messages as read
      fetchedMessages.forEach(msg => {
        if (msg.sender?._id === userId && !msg.isRead) {
          if (socketService.markAsRead) {
            socketService.markAsRead(msg._id, userId);
          }
        }
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    // Listen for new messages
    if (socketService.onNewMessage) {
      socketService.onNewMessage(({ message }) => {
        if (message?.sender?._id === userId) {
          setMessages(prev => [...prev, message]);
          // Mark as read immediately since chat is open
          if (socketService.markAsRead) {
            socketService.markAsRead(message._id, userId);
          }
          scrollToBottom();
        }
      });
    }

    // Listen for message sent confirmation
    if (socketService.onMessageSent) {
      socketService.onMessageSent(({ message }) => {
        if (message) {
          setMessages(prev => {
            // Avoid duplicates
            const exists = prev.find(m => m._id === message._id);
            if (exists) return prev;
            return [...prev, message];
          });
          scrollToBottom();
        }
      });
    }

    // Listen for delivery receipts
    if (socketService.onMessageDelivered) {
      socketService.onMessageDelivered(({ messageId }) => {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === messageId ? { ...msg, isDelivered: true } : msg
          )
        );
      });
    }

    // Listen for read receipts
    if (socketService.onMessageRead) {
      socketService.onMessageRead(({ messageId }) => {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === messageId ? { ...msg, isRead: true, readAt: new Date() } : msg
          )
        );
      });
    }

    // Listen for typing indicators
    if (socketService.onTypingStart) {
      socketService.onTypingStart(({ userId: typingUserId }) => {
        if (typingUserId === userId) {
          setIsTyping(true);
        }
      });
    }

    if (socketService.onTypingStop) {
      socketService.onTypingStop(({ userId: typingUserId }) => {
        if (typingUserId === userId) {
          setIsTyping(false);
        }
      });
    }

    // Listen for online/offline status
    if (socketService.onUserOnline) {
      socketService.onUserOnline(({ userId: onlineUserId }) => {
        if (onlineUserId === userId) {
          setIsOnline(true);
        }
      });
    }

    if (socketService.onUserOffline) {
      socketService.onUserOffline(({ userId: offlineUserId }) => {
        if (offlineUserId === userId) {
          setIsOnline(false);
        }
      });
    }

    // Get initial online users list
    if (socketService.onUsersOnline) {
      socketService.onUsersOnline(({ userIds }) => {
        if (userIds && Array.isArray(userIds)) {
          setIsOnline(userIds.includes(userId));
        }
      });
    }
  };

  const cleanupSocketListeners = () => {
    // Don't remove all listeners as it affects other screens
    // Socket listeners will be managed by the socket service
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (flatListRef.current && messages.length > 0) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);

    // Stop typing indicator
    if (socketService.stopTyping) {
      socketService.stopTyping(userId);
    }

    try {
      // Send message via socket
      if (socketService.sendMessage) {
        socketService.sendMessage(userId, messageText);
      } else {
        console.warn('Socket sendMessage not available');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  };

  const handleTextChange = (text) => {
    setInputText(text);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing start
    if (text.length > 0) {
      if (socketService.startTyping) {
        socketService.startTyping(userId);
      }

      // Auto stop typing after 3 seconds of no typing
      typingTimeoutRef.current = setTimeout(() => {
        if (socketService.stopTyping) {
          socketService.stopTyping(userId);
        }
      }, 3000);
    } else {
      if (socketService.stopTyping) {
        socketService.stopTyping(userId);
      }
    }
  };

  const getTickStyle = (item) => {
    if (!item) return null;
    
    const isSentByMe = item.sender?._id === user?._id;
    if (!isSentByMe) return null;

    if (item.isRead) {
      return { text: '✓✓', color: '#4FC3F7' }; // Blue double tick for read
    } else if (item.isDelivered) {
      return { text: '✓✓', color: 'rgba(255, 255, 255, 0.7)' }; // Gray double tick for delivered
    } else {
      return { text: '✓', color: 'rgba(255, 255, 255, 0.7)' }; // Single tick for sent
    }
  };

  const renderMessage = ({ item }) => {
    if (!item || !item.sender) return null;

    const isSentByMe = item.sender._id === user._id;
    const tickStyle = getTickStyle(item);

    return (
      <View
        style={[
          styles.messageContainer,
          isSentByMe ? styles.sentMessage : styles.receivedMessage,
        ]}
      >
        {!isSentByMe && (
          <Image
            source={{ uri: item.sender.avatar }}
            style={styles.messageAvatar}
          />
        )}
        
        <View
          style={[
            styles.messageBubble,
            isSentByMe ? styles.sentBubble : styles.receivedBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isSentByMe ? styles.sentText : styles.receivedText,
            ]}
          >
            {item.content}
          </Text>
          
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isSentByMe ? styles.sentTime : styles.receivedTime,
              ]}
            >
              {new Date(item.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            
            {tickStyle && (
              <Text style={[styles.messageTicks, { color: tickStyle.color }]}>
                {tickStyle.text}
              </Text>
            )}
          </View>
        </View>
      </View>
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item._id || `msg-${index}`}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={handleTextChange}
          multiline
          maxLength={1000}
          returnKeyType="default"
          blurOnSubmit={false}
        />
        
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isSending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ddd',
  },
  headerOnlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerTextContainer: {
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  sentMessage: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  receivedMessage: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#ddd',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sentBubble: {
    backgroundColor: '#0066cc',
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  sentText: {
    color: '#fff',
  },
  receivedText: {
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  sentTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  receivedTime: {
    color: '#999',
  },
  messageTicks: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  sendButtonDisabled: {
    backgroundColor: '#99c2e6',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatScreen;