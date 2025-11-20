import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Context } from "../../main";
import { FaEye, FaHeart, FaRegHeart, FaCalendarAlt, FaBuilding, FaCertificate } from "react-icons/fa";
import { BiMessageSquareDetail } from "react-icons/bi";
import toast from "react-hot-toast";

const CertificateDetails = () => {
  const { id } = useParams();
  const [certificate, setCertificate] = useState({});
  const [loading, setLoading] = useState(true);
  const { isAuthorized, user } = useContext(Context);
  const navigateTo = useNavigate();

  useEffect(() => {
    if (!isAuthorized) {
      navigateTo("/login");
      return;
    }
    fetchCertificate();
  }, [isAuthorized, id]);

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:4001/api/v1/certificate/${id}`,
        {
          withCredentials: true,
        }
      );
      setCertificate(response.data.certificate);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch certificate");
      navigateTo("/certificates/getall");
    } finally {
      setLoading(false);
    }
  };

  const handleLikeCertificate = async () => {
    try {
      const response = await axios.patch(
        `http://localhost:4001/api/v1/certificate/like/${id}`,
        {},
        { withCredentials: true }
      );
      
      toast.success(response.data.message);
      
      // Update the certificate likes in state
      setCertificate(prevCert => ({
        ...prevCert,
        likes: response.data.hasLiked
          ? [...prevCert.likes, user._id]
          : prevCert.likes.filter(like => like !== user._id)
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to like certificate");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  if (!isAuthorized) {
    return null;
  }

  if (loading) {
    return (
      <section className="jobDetail page">
        <div className="container">
          <div className="loading">Loading certificate details...</div>
        </div>
      </section>
    );
  }

  const isLiked = certificate.likes && certificate.likes.includes(user._id);
  const isOwnCertificate = user && certificate.postedBy && user._id === certificate.postedBy._id;

  return (
    <section className="jobDetail page">
      <div className="container">
        <div className="certificate-detail-header">
          <Link to="/certificates/getall" className="back-link">
            ← Back to Certificates
          </Link>
        </div>

        <div className="certificate-detail-content">
          <div className="certificate-main-info">
            <div className="certificate-header">
              <div className="organization-badge">
                <FaBuilding />
                <span>{certificate.issuingOrganization}</span>
              </div>
              
              <div className="certificate-stats">
                <span className="views">
                  <FaEye /> {certificate.views} views
                </span>
                <button
                  className={`like-btn ${isLiked ? 'liked' : ''}`}
                  onClick={handleLikeCertificate}
                  disabled={isOwnCertificate}
                >
                  {isLiked ? <FaHeart /> : <FaRegHeart />}
                  {certificate.likes ? certificate.likes.length : 0} likes
                </button>
              </div>
            </div>

            <h1 className="certificate-title">{certificate.title}</h1>
            
            <div className="certificate-meta">
              <div className="meta-item">
                <FaCalendarAlt />
                <span>
                  <strong>Issued:</strong> {formatDate(certificate.issueDate)}
                </span>
              </div>
              
              {certificate.expiryDate && (
                <div className="meta-item">
                  <FaCalendarAlt />
                  <span>
                    <strong>Expires:</strong> {formatDate(certificate.expiryDate)}
                  </span>
                </div>
              )}
              
              {certificate.credentialId && (
                <div className="meta-item">
                  <FaCertificate />
                  <span>
                    <strong>Credential ID:</strong> {certificate.credentialId}
                  </span>
                </div>
              )}
            </div>

            <div className="certificate-description">
              <h3>Description</h3>
              <p>{certificate.description}</p>
            </div>

            {certificate.skills && certificate.skills.length > 0 && (
              <div className="certificate-skills">
                <h3>Skills Demonstrated</h3>
                <div className="skills-container">
                  {certificate.skills.map((skill, index) => (
                    <span key={index} className="skill-badge">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {certificate.certificateUrl && (
              <div className="certificate-image-section">
                <h3>Certificate</h3>
                <div className="certificate-image-container">
                  {certificate.certificateUrl.url.includes('.pdf') ? (
                    <div className="pdf-viewer">
                      <iframe
                        src={certificate.certificateUrl.url}
                        width="100%"
                        height="600px"
                        title="Certificate PDF"
                      />
                      <a
                        href={certificate.certificateUrl.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pdf-link"
                      >
                        Open PDF in new tab
                      </a>
                    </div>
                  ) : (
                    <img
                      src={certificate.certificateUrl.url}
                      alt={certificate.title}
                      className="certificate-image"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="certificate-sidebar">
            <div className="certificate-owner-card">
              <h3>Certificate Holder</h3>
              {certificate.postedBy && (
                <div className="owner-info">
                  <h4>{certificate.postedBy.name}</h4>
                  <p className="owner-role">{certificate.postedBy.role}</p>
                  <p className="owner-email">{certificate.postedBy.email}</p>
                  {certificate.postedBy.phone && (
                    <p className="owner-phone">{certificate.postedBy.phone}</p>
                  )}
                  
                  {user && user.role === "Employer" && !isOwnCertificate && (
                    <div className="contact-actions">
                      <Link
                        to={`/message/send/${certificate.postedBy._id}?certificateId=${certificate._id}`}
                        className="message-btn-primary"
                      >
                        <BiMessageSquareDetail />
                        Send Message
                      </Link>
                    </div>
                  )}
                  
                  {isOwnCertificate && (
                    <div className="owner-actions">
                      <Link
                        to={`/certificate/edit/${certificate._id}`}
                        className="edit-btn"
                      >
                        Edit Certificate
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="certificate-verification">
              <h3>Verification Status</h3>
              <div className={`verification-status ${certificate.isVerified ? 'verified' : 'unverified'}`}>
                <span className="status-icon">
                  {certificate.isVerified ? '✓' : '○'}
                </span>
                <span className="status-text">
                  {certificate.isVerified ? 'Verified Certificate' : 'Pending Verification'}
                </span>
              </div>
            </div>

            <div className="certificate-date-info">
              <h3>Certificate Information</h3>
              <div className="date-item">
                <strong>Posted:</strong>
                <span>{formatDate(certificate.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CertificateDetails;