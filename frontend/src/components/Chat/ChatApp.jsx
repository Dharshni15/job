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
import "./ChatAppFixed.css";

const ChatApp = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  
  const { isAuthorized, user } = useContext(Context);
  const navigateTo = useNavigate();
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  useEffect(() => {
    if (!isAuthorized) {
      navigateTo("/login");
      return;
    }
    fetchConversations();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [isAuthorized]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.otherUser._id);
      
      // Poll for new messages in active conversation
      const messageInterval = setInterval(() => {
        fetchMessages(activeConversation.otherUser._id);
      }, 2000);
      
      return () => clearInterval(messageInterval);
    }
  }, [activeConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      
      // Get all users to create potential conversations
      const [sentResponse, receivedResponse] = await Promise.all([
        axios.get("http://localhost:4000/api/v1/message/sent", { withCredentials: true }),
        axios.get("http://localhost:4000/api/v1/message/received", { withCredentials: true })
      ]);

      const allMessages = [...sentResponse.data.messages, ...receivedResponse.data.messages];
      
      // Group messages by conversation partner
      const conversationMap = new Map();
      
      allMessages.forEach(message => {
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
      receivedResponse.data.messages.forEach(message => {
        if (!message.isRead) {
          const conversation = conversationMap.get(message.sender._id);
          if (conversation) {
            conversation.unreadCount++;
          }
        }
      });

      const conversationsList = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
      
      setConversations(conversationsList);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (otherUserId) => {
    try {
      const response = await axios.get(
        `http://localhost:4000/api/v1/message/conversation/${otherUserId}`,
        { withCredentials: true }
      );
      setMessages(response.data.messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeConversation || sendingMessage) {
      return;
    }

    setSendingMessage(true);
    
    try {
      const messageData = {
        receiverId: activeConversation.otherUser._id,
        subject: `Chat with ${activeConversation.otherUser.name}`,
        content: newMessage.trim(),
        messageType: "general"
      };

      const response = await axios.post(
        "http://localhost:4000/api/v1/message/send",
        messageData,
        { withCredentials: true }
      );

      setNewMessage("");
      fetchMessages(activeConversation.otherUser._id);
      fetchConversations();
      
      // Focus back on input
      messageInputRef.current?.focus();
      
    } catch (error) {
      toast.error("Failed to send message");
      console.error("Error sending message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const selectConversation = (conversation) => {
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
          "http://localhost:4000/api/v1/message/read-multiple",
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
  };

  const formatLastMessageTime = (dateString) => {
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
  };

  const filteredConversations = conversations.filter(conv =>
    conv.otherUser.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="chat-app">
      <div className="chat-container">
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
              <div className="chat-loading">Loading conversations...</div>
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
                <p>No conversations yet</p>
                <small>Start messaging by visiting certificate profiles</small>
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
                  <button className="chat-action-btn">
                    <FaPhone />
                  </button>
                  <button className="chat-action-btn">
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
                  {messages.map((message, index) => {
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
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <div className="message-input-container">
                <form onSubmit={sendMessage} className="message-form">
                  <button type="button" className="attachment-btn">
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
                    />
                    <button type="button" className="emoji-btn">
                      <FaSmile />
                    </button>
                  </div>
                  
                  <button 
                    type="submit" 
                    className={`send-btn ${newMessage.trim() ? 'active' : ''}`}
                    disabled={sendingMessage || !newMessage.trim()}
                  >
                    <FaPaperPlane />
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatApp;