import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Context } from "../../main";
import { FaEnvelope, FaEnvelopeOpen, FaTrash, FaReply } from "react-icons/fa";
import { BiMessageSquareDetail } from "react-icons/bi";
import toast from "react-hot-toast";

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [stats, setStats] = useState({});
  const [selectedMessages, setSelectedMessages] = useState([]);
  
  const { isAuthorized, user } = useContext(Context);
  const navigateTo = useNavigate();
  const location = useLocation();
  
  const isSentPage = location.pathname.includes("/sent");

  useEffect(() => {
    if (!isAuthorized) {
      navigateTo("/login");
      return;
    }
    fetchMessages();
    fetchStats();
  }, [isAuthorized, currentPage, isSentPage]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const endpoint = isSentPage ? "sent" : "received";
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10"
      });

      const response = await axios.get(
        `http://localhost:4001/api/v1/message/${endpoint}?${params.toString()}`,
        { withCredentials: true }
      );
      
      setMessages(response.data.messages);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to fetch messages");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(
        "http://localhost:4001/api/v1/message/stats",
        { withCredentials: true }
      );
      setStats(response.data.stats);
    } catch (error) {
      console.error("Failed to fetch message stats:", error);
    }
  };

  const handleMarkAsRead = async (messageId) => {
    try {
      await axios.patch(
        `http://localhost:4001/api/v1/message/read/${messageId}`,
        {},
        { withCredentials: true }
      );
      
      // Update message status in state
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg._id === messageId ? { ...msg, isRead: true } : msg
        )
      );
      
      // Update stats
      setStats(prevStats => ({
        ...prevStats,
        unreadCount: Math.max(0, prevStats.unreadCount - 1)
      }));
    } catch (error) {
      toast.error("Failed to mark message as read");
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Are you sure you want to delete this message?")) {
      return;
    }

    try {
      await axios.delete(
        `http://localhost:4001/api/v1/message/delete/${messageId}`,
        { withCredentials: true }
      );
      
      setMessages(prevMessages =>
        prevMessages.filter(msg => msg._id !== messageId)
      );
      
      toast.success("Message deleted successfully");
      fetchStats(); // Refresh stats
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  };

  const handleSelectMessage = (messageId) => {
    setSelectedMessages(prev =>
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleMarkMultipleAsRead = async () => {
    if (selectedMessages.length === 0) {
      toast.error("Please select messages first");
      return;
    }

    try {
      await axios.patch(
        "http://localhost:4001/api/v1/message/read-multiple",
        { messageIds: selectedMessages },
        { withCredentials: true }
      );
      
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          selectedMessages.includes(msg._id) ? { ...msg, isRead: true } : msg
        )
      );
      
      setSelectedMessages([]);
      toast.success("Messages marked as read");
      fetchStats();
    } catch (error) {
      toast.error("Failed to mark messages as read");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getMessageTypeLabel = (type) => {
    switch (type) {
      case "recruitment_inquiry":
        return "Recruitment Inquiry";
      case "interview_invite":
        return "Interview Invitation";
      default:
        return "General";
    }
  };

  const getMessageTypeColor = (type) => {
    switch (type) {
      case "recruitment_inquiry":
        return "#007bff";
      case "interview_invite":
        return "#28a745";
      default:
        return "#6c757d";
    }
  };

  if (!isAuthorized) {
    return null;
  }

  return (
    <section className="jobs page">
      <div className="container">
        <div className="messages-header">
          <h1>{isSentPage ? "Sent Messages" : "Inbox"}</h1>
          
          {/* Message Stats */}
          <div className="message-stats">
            <div className="stat-item">
              <span className="stat-label">Total Received:</span>
              <span className="stat-value">{stats.totalReceived || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Sent:</span>
              <span className="stat-value">{stats.totalSent || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Unread:</span>
              <span className="stat-value unread">{stats.unreadCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="message-tabs">
          <Link 
            to="/messages/received" 
            className={`tab ${!isSentPage ? 'active' : ''}`}
          >
            <FaEnvelope /> Inbox {stats.unreadCount > 0 && <span className="unread-badge">{stats.unreadCount}</span>}
          </Link>
          <Link 
            to="/messages/sent" 
            className={`tab ${isSentPage ? 'active' : ''}`}
          >
            <BiMessageSquareDetail /> Sent Messages
          </Link>
        </div>

        {/* Bulk Actions */}
        {!isSentPage && selectedMessages.length > 0 && (
          <div className="bulk-actions">
            <button 
              onClick={handleMarkMultipleAsRead}
              className="bulk-action-btn"
            >
              Mark Selected as Read ({selectedMessages.length})
            </button>
            <button 
              onClick={() => setSelectedMessages([])}
              className="bulk-action-btn cancel"
            >
              Cancel Selection
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading">Loading messages...</div>
        ) : (
          <>
            <div className="messages-list">
              {messages && messages.length > 0 ? (
                messages.map((message) => (
                  <div 
                    key={message._id} 
                    className={`message-item ${!message.isRead && !isSentPage ? 'unread' : ''}`}
                  >
                    {!isSentPage && (
                      <input
                        type="checkbox"
                        className="message-checkbox"
                        checked={selectedMessages.includes(message._id)}
                        onChange={() => handleSelectMessage(message._id)}
                      />
                    )}
                    
                    <div className="message-content">
                      <div className="message-header">
                        <div className="message-sender">
                          {isSentPage ? (
                            <><strong>To:</strong> {message.receiver?.name}</>
                          ) : (
                            <><strong>From:</strong> {message.sender?.name}</>
                          )}
                          <span className="sender-role">
                            ({isSentPage ? message.receiver?.role : message.sender?.role})
                          </span>
                        </div>
                        
                        <div className="message-meta">
                          <span 
                            className="message-type"
                            style={{ backgroundColor: getMessageTypeColor(message.messageType) }}
                          >
                            {getMessageTypeLabel(message.messageType)}
                          </span>
                          <span className="message-date">{formatDate(message.createdAt)}</span>
                        </div>
                      </div>
                      
                      <div className="message-subject">
                        <Link to={`/message/${message._id}`} className="subject-link">
                          {!message.isRead && !isSentPage && <FaEnvelope className="unread-icon" />}
                          <strong>{message.subject}</strong>
                        </Link>
                      </div>
                      
                      <div className="message-preview">
                        {message.content.length > 100 
                          ? `${message.content.substring(0, 100)}...`
                          : message.content
                        }
                      </div>
                      
                      {message.relatedCertificate && (
                        <div className="related-certificate">
                          <small>Related to certificate: {message.relatedCertificate.title}</small>
                        </div>
                      )}
                    </div>
                    
                    <div className="message-actions">
                      <Link 
                        to={`/message/${message._id}`}
                        className="action-btn view"
                      >
                        View
                      </Link>
                      
                      {!isSentPage && !message.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(message._id)}
                          className="action-btn mark-read"
                        >
                          <FaEnvelopeOpen />
                        </button>
                      )}
                      
                      {!isSentPage && (
                        <Link
                          to={`/message/send/${isSentPage ? message.receiver?._id : message.sender?._id}`}
                          className="action-btn reply"
                        >
                          <FaReply />
                        </Link>
                      )}
                      
                      {!isSentPage && (
                        <button
                          onClick={() => handleDeleteMessage(message._id)}
                          className="action-btn delete"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-messages">
                  <h3>No messages found</h3>
                  <p>{isSentPage ? "You haven't sent any messages yet." : "Your inbox is empty."}</p>
                </div>
              )}
            </div>
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className="pagination-btn"
                >
                  Previous
                </button>
                
                <span className="page-info">
                  Page {pagination.currentPage} of {pagination.totalPages}
                  ({pagination.totalMessages} total messages)
                </span>
                
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default Messages;