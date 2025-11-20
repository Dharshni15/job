import React, { useContext, useEffect, useState } from "react";
import { Context } from "../../main";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const SendMessage = () => {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [messageType, setMessageType] = useState("general");
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [receiverInfo, setReceiverInfo] = useState(null);
  const [certificateInfo, setCertificateInfo] = useState(null);

  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const certificateId = searchParams.get("certificateId");
  
  const { isAuthorized, user } = useContext(Context);
  const navigateTo = useNavigate();

  useEffect(() => {
    if (!isAuthorized) {
      navigateTo("/login");
      return;
    }
    
    fetchReceiverInfo();
    if (certificateId) {
      fetchCertificateInfo();
    }
  }, [isAuthorized, userId, certificateId]);

  const fetchReceiverInfo = async () => {
    try {
      // In a real app, you might have a separate endpoint to get user info
      // For now, we'll set a placeholder that will be handled by the backend
      setReceiverInfo({ _id: userId });
    } catch (error) {
      toast.error("Failed to load recipient information");
      navigateTo("/certificates/getall");
    }
  };

  const fetchCertificateInfo = async () => {
    try {
      const response = await axios.get(
        `http://localhost:4001/api/v1/certificate/${certificateId}`,
        { withCredentials: true }
      );
      setCertificateInfo(response.data.certificate);
      
      // Pre-fill subject if it's related to a certificate
      if (user.role === "Employer") {
        setSubject(`Interested in your certificate: ${response.data.certificate.title}`);
        setMessageType("recruitment_inquiry");
      }
    } catch (error) {
      console.error("Failed to load certificate info:", error);
    }
  };

  const handleAttachmentChange = (event) => {
    const files = Array.from(event.target.files);
    setAttachments(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.append("receiverId", userId);
    formData.append("subject", subject);
    formData.append("content", content);
    formData.append("messageType", messageType);
    
    if (certificateId) {
      formData.append("relatedCertificate", certificateId);
    }
    
    // Append attachments
    attachments.forEach((file, index) => {
      formData.append("attachments", file);
    });

    try {
      const response = await axios.post(
        "http://localhost:4001/api/v1/message/send",
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      
      toast.success(response.data.message);
      navigateTo("/messages/sent");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="job_post page">
      <div className="container">
        <h3>Send Message</h3>
        
        {certificateInfo && (
          <div className="certificate-context">
            <h4>Related to Certificate:</h4>
            <div className="certificate-preview">
              <strong>{certificateInfo.title}</strong>
              <p>by {certificateInfo.postedBy?.name}</p>
              <p>{certificateInfo.issuingOrganization}</p>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="wrapper">
            <select
              value={messageType}
              onChange={(e) => setMessageType(e.target.value)}
            >
              <option value="general">General Message</option>
              {user.role === "Employer" && (
                <>
                  <option value="recruitment_inquiry">Recruitment Inquiry</option>
                  <option value="interview_invite">Interview Invitation</option>
                </>
              )}
            </select>
          </div>
          
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            required
          />
          
          <textarea
            rows="10"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Your message..."
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
              Attachments (Optional)
            </label>
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
              onChange={handleAttachmentChange}
              style={{ width: "100%" }}
            />
            {attachments.length > 0 && (
              <div className="attachment-preview">
                <p>Selected files:</p>
                <ul>
                  {attachments.map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SendMessage;