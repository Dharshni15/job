import React, { useContext, useEffect, useState, useRef } from "react";
import axios from "axios";
import { Context } from "../../main";
import { useNavigate } from "react-router-dom";
import { 
  FaSearch, 
  FaPaperPlane, 
  FaEllipsisV, 
  FaPhone, 
  FaVideo, 
  FaSmile,
  FaPaperclip,
  FaArrowLeft,
  FaUserCircle,
  FaCheck,
  FaCheckDouble,
  FaTimes,
  FaExclamationCircle
} from "react-icons/fa";
import toast from "react-hot-toast";

const ChatApp = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [error, setError] = useState(null);
  const [connectionError, setConnectionError] = useState(false);
  
  const { isAuthorized, user } = useContext(Context);
  const navigateTo = useNavigate();
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  // Use environment variable if available, otherwise fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4001/api/v1";

  useEffect(() => {
    if (!isAuthorized) {
      navigateTo("/login");
      return;
    }
    
    if (!user) {
      console.log("User not available yet, waiting...");
      return;
    }
    
    initializeChat();
  }, [isAuthorized, user]);

  useEffect(() => {
    if (activeConversation && user) {
      fetchMessages(activeConversation.otherUser._id);
      
      // Poll for new messages in active conversation
      const messageInterval = setInterval(() => {
        fetchMessages(activeConversation.otherUser._id);
      }, 3000);
      
      return () => clearInterval(messageInterval);
    }
  }, [activeConversation, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      setLoading(true);
      setError(null);
      setConnectionError(false);
      
      await fetchConversations();
      
      // Set up polling for real-time updates
      const interval = setInterval(fetchConversations, 10000);
      return () => clearInterval(interval);
    } catch (error) {
      console.error("Failed to initialize chat:", error);
      setConnectionError(true);
      toast.error("Failed to load chat. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    try {
      console.log("Fetching conversations...");
      
      // Get all messages (both sent and received)
      const [sentResponse, receivedResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/message/sent`, { 
          withCredentials: true,
          timeout: 10000
        }),
        axios.get(`${API_BASE_URL}/message/received`, { 
          withCredentials: true,
          timeout: 10000
        })
      ]);

      console.log("Sent messages:", sentResponse.data);
      console.log("Received messages:", receivedResponse.data);

      const sentMessages = sentResponse.data.messages || [];
      const receivedMessages = receivedResponse.data.messages || [];
      const allMessages = [...sentMessages, ...receivedMessages];
      
      if (allMessages.length === 0) {
        setConversations([]);
        console.log("No messages found");
        return;
      }
      
      // Group messages by conversation partner
      const conversationMap = new Map();
      
      allMessages.forEach(message => {
        if (!message.sender || !message.receiver) {
          console.warn("Message missing sender or receiver:", message);
          return;
        }
        
        const otherUserId = message.sender._id === user._id 
          ? message.receiver._id 
          : message.sender._id;
        
        const otherUser = message.sender._id === user._id 
          ? message.receiver 
          : message.sender;
        
        if (!conversationMap.has(otherUserId) || 
            new Date(message.createdAt) > new Date(conversationMap.get(otherUserId).lastMessage.createdAt)) {
          conversationMap.set(otherUserId, {
            otherUser,
            lastMessage: message,
            unreadCount: 0
          });
        }
      });

      // Calculate unread counts
      receivedMessages.forEach(message => {
        if (!message.isRead && message.sender) {
          const conversation = conversationMap.get(message.sender._id);
          if (conversation) {
            conversation.unreadCount++;
          }
        }
      });

      const conversationsList = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
      
      console.log("Processed conversations:", conversationsList);
      setConversations(conversationsList);
      setConnectionError(false);
      
    } catch (error) {
      console.error("Error fetching conversations:", error);
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        setConnectionError(true);
        toast.error("Cannot connect to server. Please check your connection.");
      } else if (error.response?.status === 401) {
        toast.error("Please login to access messages");
        navigateTo("/login");
      } else {
        setError("Failed to load conversations");
        toast.error("Failed to load conversations");
      }
    }
  };

  const fetchMessages = async (otherUserId) => {
    try {
      console.log(`Fetching conversation with user ${otherUserId}`);
      
      const response = await axios.get(
        `${API_BASE_URL}/message/conversation/${otherUserId}`,
        { 
          withCredentials: true,
          timeout: 10000
        }
      );
      
      console.log("Fetched messages:", response.data);
      setMessages(response.data.messages || []);
      setConnectionError(false);
      
    } catch (error) {
      console.error("Error fetching messages:", error);
      
      if (error.response?.status === 401) {
        toast.error("Please login to access messages");
        navigateTo("/login");
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        setConnectionError(true);
      } else {
        toast.error("Failed to load messages");
      }
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeConversation || sendingMessage) {
      return;
    }

    const messageToSend = newMessage.trim();
    setSendingMessage(true);
    setNewMessage(""); // Clear input immediately for better UX
    
    try {
      const messageData = {
        receiverId: activeConversation.otherUser._id,
        subject: `Chat with ${activeConversation.otherUser.name}`,
        content: messageToSend,
        messageType: "general"
      };

      console.log("Sending message:", messageData);

      const response = await axios.post(
        `${API_BASE_URL}/message/send`,
        messageData,
        { 
          withCredentials: true,
          timeout: 10000
        }
      );

      console.log("Message sent successfully:", response.data);
      
      // Refresh messages and conversations
      await fetchMessages(activeConversation.otherUser._id);
      await fetchConversations();
      
      // Focus back on input
      messageInputRef.current?.focus();
      setConnectionError(false);
      
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Restore message in input if sending failed
      setNewMessage(messageToSend);
      
      if (error.response?.status === 401) {
        toast.error("Please login to send messages");
        navigateTo("/login");
      } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        setConnectionError(true);
        toast.error("Cannot connect to server. Message not sent.");
        // Try to reconnect after 5 seconds
        setTimeout(() => {
          fetchConversations();
        }, 5000);
      } else {
        toast.error(error.response?.data?.message || "Failed to send message. Please try again.");
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const selectConversation = (conversation) => {
    console.log("Selecting conversation:", conversation);
    setActiveConversation(conversation);
    setShowMobileChat(true);
    
    // Mark messages as read
    if (conversation.unreadCount > 0) {
      markConversationAsRead(conversation.otherUser._id);
    }
  };

  const markConversationAsRead = async (otherUserId) => {
    try {
      const unreadMessages = messages
        .filter(msg => msg.receiver._id === user._id && !msg.isRead)
        .map(msg => msg._id);
        
      if (unreadMessages.length > 0) {
        await axios.patch(
          `${API_BASE_URL}/message/read-multiple`,
          { messageIds: unreadMessages },
          { withCredentials: true }
        );
        fetchConversations();
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const formatMessageTime = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return date.toLocaleTimeString("en-US", { 
          hour: "2-digit", 
          minute: "2-digit" 
        });
      } else if (diffInHours < 48) {
        return "Yesterday";
      } else {
        return date.toLocaleDateString("en-US", { 
          month: "short", 
          day: "numeric" 
        });
      }
    } catch (error) {
      return "";
    }
  };

  const formatLastMessageTime = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = (now - date) / (1000 * 60);
      
      if (diffInMinutes < 60) {
        return `${Math.floor(diffInMinutes)}m`;
      } else if (diffInMinutes < 1440) {
        return `${Math.floor(diffInMinutes / 60)}h`;
      } else {
        return `${Math.floor(diffInMinutes / 1440)}d`;
      }
    } catch (error) {
      return "";
    }
  };

  const retryConnection = () => {
    setConnectionError(false);
    setError(null);
    initializeChat();
  };

  const filteredConversations = conversations.filter(conv =>
    conv.otherUser?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAuthorized || !user) {
    return (
      <div className="chat-loading">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="chat-app">
      <div className="chat-container">
        {/* Connection Error Banner */}
        {connectionError && (
          <div className="chat-error-banner">
            <FaExclamationCircle />
            <span>Connection lost. Messages may not be up to date.</span>
            <button onClick={retryConnection}>Retry</button>
          </div>
        )}

        {/* Conversations Sidebar */}
        <div className={`conversations-sidebar ${showMobileChat ? 'mobile-hidden' : ''}`}>
          <div className="chat-header">
            <h2>Messages</h2>
            <div className="chat-search">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="conversations-list">
            {loading ? (
              <div className="chat-loading">
                <div className="loading-spinner"></div>
                <p>Loading conversations...</p>
              </div>
            ) : error ? (
              <div className="chat-error">
                <FaExclamationCircle />
                <p>{error}</p>
                <button onClick={retryConnection}>Try Again</button>
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.otherUser._id}
                  className={`conversation-item ${
                    activeConversation?.otherUser._id === conversation.otherUser._id ? 'active' : ''
                  }`}
                  onClick={() => selectConversation(conversation)}
                >
                  <div className="conversation-avatar">
                    <FaUserCircle />
                    <span className={`status-indicator ${conversation.otherUser.isOnline ? 'online' : 'offline'}`}></span>
                  </div>
                  
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <h4 className="conversation-name">{conversation.otherUser.name}</h4>
                      <span className="conversation-time">
                        {formatLastMessageTime(conversation.lastMessage.createdAt)}
                      </span>
                    </div>
                    
                    <div className="conversation-preview">
                      <p className="last-message">
                        {conversation.lastMessage.sender._id === user._id && "You: "}
                        {conversation.lastMessage.content.length > 50
                          ? `${conversation.lastMessage.content.substring(0, 50)}...`
                          : conversation.lastMessage.content}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="unread-badge">{conversation.unreadCount}</span>
                      )}
                    </div>
                    
                    <div className="user-role-badge">
                      {conversation.otherUser.role}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-conversations">
                <FaUserCircle className="placeholder-icon" />
                <p>No conversations yet</p>
                <small>Start messaging by visiting certificate profiles</small>
                <div className="suggestion-links">
                  <button onClick={() => navigateTo("/certificates/getall")}>
                    Browse Certificates
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`chat-window ${!activeConversation ? 'no-chat-selected' : ''} ${showMobileChat ? 'mobile-visible' : ''}`}>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="chat-window-header">
                <button 
                  className="mobile-back-btn"
                  onClick={() => setShowMobileChat(false)}
                >
                  <FaArrowLeft />
                </button>
                
                <div className="chat-user-info">
                  <div className="chat-avatar">
                    <FaUserCircle />
                    <span className={`status-indicator ${activeConversation.otherUser.isOnline ? 'online' : 'offline'}`}></span>
                  </div>
                  <div className="chat-user-details">
                    <h3>{activeConversation.otherUser.name}</h3>
                    <span className="user-status">
                      {activeConversation.otherUser.role} • {activeConversation.otherUser.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                
                <div className="chat-actions">
                  <button className="chat-action-btn" disabled>
                    <FaPhone />
                  </button>
                  <button className="chat-action-btn" disabled>
                    <FaVideo />
                  </button>
                  <button className="chat-action-btn">
                    <FaEllipsisV />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="messages-container">
                <div className="messages-list">
                  {messages.length > 0 ? (
                    messages.map((message, index) => {
                      const isOwn = message.sender._id === user._id;
                      const showTime = index === 0 || 
                        (new Date(message.createdAt) - new Date(messages[index - 1].createdAt)) > 300000; // 5 minutes
                      
                      return (
                        <div key={message._id} className="message-wrapper">
                          {showTime && (
                            <div className="message-time-divider">
                              {formatMessageTime(message.createdAt)}
                            </div>
                          )}
                          
                          <div className={`message ${isOwn ? 'own' : 'other'}`}>
                            <div className="message-content">
                              <p>{message.content}</p>
                              <div className="message-meta">
                                <span className="message-timestamp">
                                  {new Date(message.createdAt).toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </span>
                                {isOwn && (
                                  <span className="message-status">
                                    {message.isRead ? <FaCheckDouble className="read" /> : <FaCheck />}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-messages">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <div className="message-input-container">
                <form onSubmit={sendMessage} className="message-form">
                  <button type="button" className="attachment-btn" disabled>
                    <FaPaperclip />
                  </button>
                  
                  <div className="message-input-wrapper">
                    <input
                      ref={messageInputRef}
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      disabled={sendingMessage}
                      className="message-input"
                      autoFocus
                    />
                    <button type="button" className="emoji-btn" disabled>
                      <FaSmile />
                    </button>
                  </div>
                  
                  <button 
                    type="submit" 
                    className={`send-btn ${newMessage.trim() ? 'active' : ''}`}
                    disabled={sendingMessage || !newMessage.trim()}
                    title={sendingMessage ? "Sending..." : "Send message"}
                  >
                    {sendingMessage ? (
                      <div className="sending-spinner"></div>
                    ) : (
                      <FaPaperPlane />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="no-chat-placeholder">
              <div className="placeholder-content">
                <FaUserCircle className="placeholder-icon" />
                <h3>Select a conversation</h3>
                <p>Choose a conversation from the sidebar to start messaging</p>
                {conversations.length === 0 && (
                  <div className="get-started">
                    <p>To start chatting:</p>
                    <ol>
                      <li>Browse certificates and profiles</li>
                      <li>Send a message to someone</li>
                      <li>Your conversations will appear here</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatApp;