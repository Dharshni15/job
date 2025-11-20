import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Context } from "../../main";
import { FaEye, FaHeart, FaRegHeart, FaSearch } from "react-icons/fa";
import { BiMessageSquareDetail } from "react-icons/bi";
import toast from "react-hot-toast";

const Certificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [skillsFilter, setSkillsFilter] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  
  const { isAuthorized, user } = useContext(Context);
  const navigateTo = useNavigate();
  const location = useLocation();
  
  const isMyPage = location.pathname === "/certificates/me";

  useEffect(() => {
    if (!isAuthorized) {
      navigateTo("/login");
      return;
    }
    fetchCertificates();
  }, [isAuthorized, currentPage, searchTerm, skillsFilter, organizationFilter]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12"
      });
      
      if (!isMyPage) {
        if (searchTerm) params.append("search", searchTerm);
        if (skillsFilter) params.append("skills", skillsFilter);
        if (organizationFilter) params.append("organization", organizationFilter);
      }

      const endpoint = isMyPage ? "me" : "getall";
      const response = await axios.get(
        `http://localhost:4001/api/v1/certificate/${endpoint}?${params.toString()}`,
        {
          withCredentials: true,
        }
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

  const handleLikeCertificate = async (certificateId) => {
    try {
      const response = await axios.patch(
        `http://localhost:4001/api/v1/certificate/like/${certificateId}`,
        {},
        { withCredentials: true }
      );
      
      toast.success(response.data.message);
      
      // Update the certificate in the state
      setCertificates(prevCerts =>
        prevCerts.map(cert =>
          cert._id === certificateId
            ? {
                ...cert,
                likes: response.data.hasLiked
                  ? [...cert.likes, user._id]
                  : cert.likes.filter(like => like !== user._id)
              }
            : cert
        )
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to like certificate");
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCertificates();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSkillsFilter("");
    setOrganizationFilter("");
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  if (!isAuthorized) {
    return null;
  }

  return (
    <section className="jobs page">
      <div className="container">
        <h1>{isMyPage ? "My Certificates" : "Browse Certificates"}</h1>
        
        {/* Search and Filter Section */}
        {!isMyPage && (
        <div className="search-filter-container">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-wrapper">
              <input
                type="text"
                placeholder="Search certificates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit">
                <FaSearch />
              </button>
            </div>
          </form>
          
          <div className="filters">
            <input
              type="text"
              placeholder="Filter by skills (comma separated)"
              value={skillsFilter}
              onChange={(e) => setSkillsFilter(e.target.value)}
            />
            <input
              type="text"
              placeholder="Filter by organization"
              value={organizationFilter}
              onChange={(e) => setOrganizationFilter(e.target.value)}
            />
            <button onClick={clearFilters} className="clear-filters">
              Clear Filters
            </button>
          </div>
        </div>
        )}

        {loading ? (
          <div className="loading">Loading certificates...</div>
        ) : (
          <>
            <div className="banner">
              {certificates && certificates.length > 0 ? (
                <div className="card-container">
                  {certificates.map((certificate) => {
                    const isLiked = certificate.likes.includes(user._id);
                    return (
                      <div className="card" key={certificate._id}>
                        <div className="card-content">
                          <div className="certificate-header">
                            <p className="organization">{certificate.issuingOrganization}</p>
                            <div className="certificate-stats">
                              <span><FaEye /> {certificate.views}</span>
                              <button
                                className={`like-btn ${isLiked ? 'liked' : ''}`}
                                onClick={() => handleLikeCertificate(certificate._id)}
                              >
                                {isLiked ? <FaHeart /> : <FaRegHeart />}
                                {certificate.likes.length}
                              </button>
                            </div>
                          </div>
                          
                          <div className="certificate-main-content">
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
                                <p><strong>Credential:</strong> {certificate.credentialId}</p>
                              )}
                            </div>
                            
                            {certificate.skills && certificate.skills.length > 0 && (
                              <div className="skills-tags">
                                {certificate.skills.slice(0, 5).map((skill, index) => (
                                  <span key={index} className="skill-tag">
                                    {skill}
                                  </span>
                                ))}
                                {certificate.skills.length > 5 && (
                                  <span className="skill-tag">+{certificate.skills.length - 5}</span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="certificate-footer">
                            <p className="posted-by">
                              <strong>By:</strong> {certificate.postedBy.name}
                            </p>
                            <div className="certificate-actions">
                              <Link to={`/certificate/${certificate._id}`} className="view-btn">
                                View Details
                              </Link>
                              {user && user.role === "Employer" && (
                                <Link
                                  to={`/message/send/${certificate.postedBy._id}?certificateId=${certificate._id}`}
                                  className="message-btn"
                                >
                                  <BiMessageSquareDetail /> Message
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-certificates">
                  <h3>No certificates found</h3>
                  <p>Try adjusting your search criteria or check back later.</p>
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

export default Certificates;