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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { messageAPI } from '../services/api';
import socketService from '../services/socket';

const ChatScreen = ({ route }) => {
  const { userId, userName, userAvatar } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    setupSocketListeners();

    return () => {
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Remove socket listeners
      socketService.removeAllListeners();
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await messageAPI.getMessages(userId);
      setMessages(response.data.data);
      
      // Mark messages as read
      response.data.data.forEach(msg => {
        if (msg.sender._id === userId && !msg.isRead) {
          socketService.markAsRead(msg._id, userId);
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
    socketService.onNewMessage(({ message }) => {
      if (message.sender._id === userId) {
        setMessages(prev => [...prev, message]);
        // Mark as read immediately
        socketService.markAsRead(message._id, userId);
        scrollToBottom();
      }
    });

    // Listen for message sent confirmation
    socketService.onMessageSent(({ message }) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    // Listen for delivery receipts
    socketService.onMessageDelivered(({ messageId }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId ? { ...msg, isDelivered: true } : msg
        )
      );
    });

    // Listen for read receipts
    socketService.onMessageRead(({ messageId }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId ? { ...msg, isRead: true } : msg
        )
      );
    });

    // Listen for typing indicators
    socketService.onTypingStart(({ userId: typingUserId }) => {
      if (typingUserId === userId) {
        setIsTyping(true);
      }
    });

    socketService.onTypingStop(({ userId: typingUserId }) => {
      if (typingUserId === userId) {
        setIsTyping(false);
      }
    });
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);

    // Stop typing indicator
    socketService.stopTyping(userId);

    // Send message via socket
    socketService.sendMessage(userId, messageText);
    
    setIsSending(false);
    scrollToBottom();
  };

  const handleTextChange = (text) => {
    setInputText(text);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing start
    if (text.length > 0) {
      socketService.startTyping(userId);

      // Auto stop typing after 3 seconds of no typing
      typingTimeoutRef.current = setTimeout(() => {
        socketService.stopTyping(userId);
      }, 3000);
    } else {
      socketService.stopTyping(userId);
    }
  };

  const renderMessage = ({ item }) => {
    const isSentByMe = item.sender._id === user._id;
    const showTicks = isSentByMe;

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
            
            {showTicks && (
              <Text style={styles.messageTicks}>
                {item.isRead ? '✓✓' : item.isDelivered ? '✓✓' : '✓'}
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToBottom}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        }
      />

      {isTyping && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>{userName} is typing...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={handleTextChange}
          multiline
          maxLength={1000}
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
    color: 'rgba(255, 255, 255, 0.9)',
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
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