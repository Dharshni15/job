import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Context } from "../../main";
import { FaReply, FaDownload, FaCalendarAlt, FaCertificate } from "react-icons/fa";
import { BiMessageSquareDetail } from "react-icons/bi";
import toast from "react-hot-toast";

const MessageDetails = () => {
  const { id } = useParams();
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isAuthorized, user } = useContext(Context);
  const navigateTo = useNavigate();

  useEffect(() => {
    if (!isAuthorized) {
      navigateTo("/login");
      return;
    }
    fetchMessage();
  }, [isAuthorized, id]);

  const fetchMessage = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:4001/api/v1/message/${messageId}`,
        { withCredentials: true }
      );
      setMessage(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch message");
      navigateTo("/messages/received");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
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
        return "General Message";
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

  if (loading) {
    return (
      <section className="jobDetail page">
        <div className="container">
          <div className="loading">Loading message...</div>
        </div>
      </section>
    );
  }

  if (!message) {
    return (
      <section className="jobDetail page">
        <div className="container">
          <div className="no-messages">
            <h3>Message not found</h3>
            <p>The message you're looking for doesn't exist or you don't have permission to view it.</p>
            <Link to="/messages/received" className="view-btn">
              Back to Messages
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const isReceiver = message.receiver._id === user._id;
  const otherUser = isReceiver ? message.sender : message.receiver;

  return (
    <section className="jobDetail page">
      <div className="container">
        <div className="certificate-detail-header">
          <Link to="/messages/received" className="back-link">
            ← Back to Messages
          </Link>
        </div>

        <div className="message-detail-container">
          <div className="message-detail-main">
            {/* Message Header */}
            <div className="message-detail-header-card">
              <div className="message-type-badge" style={{ backgroundColor: getMessageTypeColor(message.messageType) }}>
                {getMessageTypeLabel(message.messageType)}
              </div>
              
              <h1 className="message-detail-subject">{message.subject}</h1>
              
              <div className="message-participants">
                <div className="participant-info">
                  <strong>From:</strong> {message.sender.name} 
                  <span className="participant-role">({message.sender.role})</span>
                </div>
                <div className="participant-info">
                  <strong>To:</strong> {message.receiver.name} 
                  <span className="participant-role">({message.receiver.role})</span>
                </div>
                <div className="message-date-info">
                  <FaCalendarAlt />
                  <span>{formatDate(message.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Related Certificate */}
            {message.relatedCertificate && (
              <div className="related-certificate-card">
                <div className="related-certificate-header">
                  <FaCertificate />
                  <h3>Related Certificate</h3>
                </div>
                <div className="related-certificate-content">
                  <Link 
                    to={`/certificate/${message.relatedCertificate._id}`}
                    className="related-certificate-link"
                  >
                    <strong>{message.relatedCertificate.title}</strong>
                    {message.relatedCertificate.description && (
                      <p className="related-cert-description">
                        {message.relatedCertificate.description.length > 150
                          ? `${message.relatedCertificate.description.substring(0, 150)}...`
                          : message.relatedCertificate.description}
                      </p>
                    )}
                  </Link>
                </div>
              </div>
            )}

            {/* Message Content */}
            <div className="message-detail-content">
              <h3>Message</h3>
              <div className="message-content-text">
                {message.content.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="message-attachments">
                <h3>Attachments</h3>
                <div className="attachments-list">
                  {message.attachments.map((attachment, index) => (
                    <div key={index} className="attachment-item">
                      <div className="attachment-info">
                        <span className="attachment-name">{attachment.filename}</span>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="download-btn"
                        >
                          <FaDownload />
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Message Sidebar */}
          <div className="message-detail-sidebar">
            <div className="message-actions-card">
              <h3>Actions</h3>
              <div className="message-actions-list">
                {isReceiver && (
                  <Link
                    to={`/message/send/${message.sender._id}`}
                    className="message-action-btn reply"
                  >
                    <FaReply />
                    Reply
                  </Link>
                )}
                
                <Link
                  to="/messages/received"
                  className="message-action-btn back"
                >
                  Back to Inbox
                </Link>
                
                <Link
                  to="/messages/sent"
                  className="message-action-btn sent"
                >
                  View Sent Messages
                </Link>
              </div>
            </div>

            <div className="message-sender-card">
              <h3>{isReceiver ? "From" : "To"}</h3>
              <div className="sender-info">
                <h4>{otherUser.name}</h4>
                <p className="sender-role">{otherUser.role}</p>
                <p className="sender-email">{otherUser.email}</p>
                {otherUser.phone && (
                  <p className="sender-phone">{otherUser.phone}</p>
                )}
                
                {isReceiver && (
                  <div className="contact-actions">
                    <Link
                      to={`/message/send/${otherUser._id}`}
                      className="message-btn-primary"
                    >
                      <BiMessageSquareDetail />
                      Send New Message
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="message-info-card">
              <h3>Message Info</h3>
              <div className="message-meta-info">
                <div className="meta-info-item">
                  <strong>Status:</strong>
                  <span className={`status-badge ${message.isRead ? 'read' : 'unread'}`}>
                    {message.isRead ? 'Read' : 'Unread'}
                  </span>
                </div>
                
                <div className="meta-info-item">
                  <strong>Type:</strong>
                  <span>{getMessageTypeLabel(message.messageType)}</span>
                </div>
                
                <div className="meta-info-item">
                  <strong>Sent:</strong>
                  <span>{formatDate(message.createdAt)}</span>
                </div>
                
                {message.readAt && (
                  <div className="meta-info-item">
                    <strong>Read:</strong>
                    <span>{formatDate(message.readAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MessageDetails;