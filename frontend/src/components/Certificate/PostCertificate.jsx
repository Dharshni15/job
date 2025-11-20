import React, { useContext, useState } from "react";
import { Context } from "../../main";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const PostCertificate = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issuingOrganization, setIssuingOrganization] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [credentialId, setCredentialId] = useState("");
  const [skills, setSkills] = useState("");
  const [certificate, setCertificate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { isAuthorized, user } = useContext(Context);
  const navigateTo = useNavigate();

  const handleCertificateChange = (event) => {
    setCertificate(event.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("issuingOrganization", issuingOrganization);
    formData.append("issueDate", issueDate);
    if (expiryDate) formData.append("expiryDate", expiryDate);
    if (credentialId) formData.append("credentialId", credentialId);
    if (skills) formData.append("skills", skills);
    formData.append("certificate", certificate);

    try {
      const res = await axios.post(
        "http://localhost:4001/api/v1/certificate/post",
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      toast.success(res.data.message);
      setTitle("");
      setDescription("");
      setIssuingOrganization("");
      setIssueDate("");
      setExpiryDate("");
      setCredentialId("");
      setSkills("");
      setCertificate(null);
      navigateTo("/certificates/me");
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong!");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthorized || (user && user.role !== "Job Seeker")) {
    navigateTo("/");
  }

  return (
    <>
      <div className="job_post page">
        <div className="container">
          <h3>POST A CERTIFICATE</h3>
          <form onSubmit={handleSubmit}>
            <div className="wrapper">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Certificate Title"
                required
              />
              <input
                type="text"
                value={issuingOrganization}
                onChange={(e) => setIssuingOrganization(e.target.value)}
                placeholder="Issuing Organization"
                required
              />
            </div>
            <div className="wrapper">
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                placeholder="Issue Date"
                required
              />
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                placeholder="Expiry Date (Optional)"
              />
            </div>
            <input
              type="text"
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
              placeholder="Credential ID (Optional)"
            />
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="Skills (comma separated, e.g., React, JavaScript, Node.js)"
            />
            <textarea
              rows="10"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Certificate Description"
              required
            />
            <div>
              <label
                style={{
                  textAlign: "start",
                  display: "block",
                  fontSize: "20px",
                  marginBottom: "10px",
                }}
              >
                Upload Certificate Image/PDF
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleCertificateChange}
                style={{ width: "100%" }}
                required
              />
            </div>
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Posting Certificate..." : "Create Certificate"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default PostCertificate;