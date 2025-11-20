import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Context } from "../../main";
import { FaEye, FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import toast from "react-hot-toast";

const MyCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  
  const { isAuthorized, user } = useContext(Context);
  const navigateTo = useNavigate();

  useEffect(() => {
    if (!isAuthorized) {
      navigateTo("/login");
      return;
    }
    if (user && user.role !== "Job Seeker") {
      navigateTo("/");
      return;
    }
    fetchMyCertificates();
  }, [isAuthorized, user, currentPage]);

  const fetchMyCertificates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12"
      });

      const response = await axios.get(
        `http://localhost:4001/api/v1/certificate/me?${params.toString()}`,
        { withCredentials: true }
      );
      
      setCertificates(response.data.certificates);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      toast.error("Failed to fetch certificates");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCertificate = async (certificateId, certificateTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${certificateTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(
        `http://localhost:4001/api/v1/certificate/delete/${certificateId}`,
        { withCredentials: true }
      );
      
      setCertificates(prevCerts =>
        prevCerts.filter(cert => cert._id !== certificateId)
      );
      
      toast.success("Certificate deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete certificate");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  if (!isAuthorized || (user && user.role !== "Job Seeker")) {
    return null;
  }

  return (
    <section className="jobs page">
      <div className="container">
        <div className="my-certificates-header">
          <h1>My Certificates</h1>
          <Link to="/certificate/post" className="add-certificate-btn">
            <FaPlus />
            Add New Certificate
          </Link>
        </div>

        {loading ? (
          <div className="loading">Loading your certificates...</div>
        ) : (
          <>
            {certificates && certificates.length > 0 ? (
              <>
                <div className="my-certificates-stats">
                  <div className="stat-card">
                    <span className="stat-number">{pagination.totalCertificates}</span>
                    <span className="stat-label">Total Certificates</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-number">
                      {certificates.reduce((sum, cert) => sum + cert.views, 0)}
                    </span>
                    <span className="stat-label">Total Views</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-number">
                      {certificates.reduce((sum, cert) => sum + cert.likes.length, 0)}
                    </span>
                    <span className="stat-label">Total Likes</span>
                  </div>
                </div>

                <div className="banner">
                  <div className="card-container">
                    {certificates.map((certificate) => (
                      <div className="my-certificate-card" key={certificate._id}>
                        <div className="my-cert-header">
                          <div className="organization">{certificate.issuingOrganization}</div>
                          <div className="certificate-stats">
                            <span><FaEye /> {certificate.views}</span>
                            <span>❤️ {certificate.likes.length}</span>
                          </div>
                        </div>
                        
                        <h3>{certificate.title}</h3>
                        <p className="description">
                          {certificate.description.length > 120
                            ? `${certificate.description.substring(0, 120)}...`
                            : certificate.description}
                        </p>
                        
                        <div className="certificate-details">
                          <p><strong>Issued:</strong> {formatDate(certificate.issueDate)}</p>
                          {certificate.expiryDate && (
                            <p><strong>Expires:</strong> {formatDate(certificate.expiryDate)}</p>
                          )}
                          {certificate.credentialId && (
                            <p><strong>Credential ID:</strong> {certificate.credentialId}</p>
                          )}
                        </div>
                        
                        {certificate.skills && certificate.skills.length > 0 && (
                          <div className="skills-tags">
                            {certificate.skills.slice(0, 3).map((skill, index) => (
                              <span key={index} className="skill-tag">
                                {skill}
                              </span>
                            ))}
                            {certificate.skills.length > 3 && (
                              <span className="skill-tag more">
                                +{certificate.skills.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="certificate-status">
                          <span className={`verification-badge ${certificate.isVerified ? 'verified' : 'pending'}`}>
                            {certificate.isVerified ? '✓ Verified' : '○ Pending'}
                          </span>
                        </div>
                        
                        <div className="my-cert-actions">
                          <Link to={`/certificate/${certificate._id}`} className="action-btn view">
                            <FaEye /> View
                          </Link>
                          <Link 
                            to={`/certificate/edit/${certificate._id}`} 
                            className="action-btn edit"
                          >
                            <FaEdit /> Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteCertificate(certificate._id, certificate.title)}
                            className="action-btn delete"
                          >
                            <FaTrash /> Delete
                          </button>
                        </div>
                        
                        <div className="certificate-date">
                          <small>Posted on {formatDate(certificate.createdAt)}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="no-certificates">
                <div className="empty-state">
                  <h3>No certificates yet</h3>
                  <p>Start showcasing your skills and achievements by adding your first certificate.</p>
                  <Link to="/certificate/post" className="get-started-btn">
                    <FaPlus />
                    Add Your First Certificate
                  </Link>
                </div>
              </div>
            )}
            
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
                  ({pagination.totalCertificates} total certificates)
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

export default MyCertificates;