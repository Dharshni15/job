import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Sender is required!"],
  },
  receiver: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Receiver is required!"],
  },
  subject: {
    type: String,
    required: [true, "Please enter message subject!"],
    minLength: [5, "Subject must contain at least 5 Characters!"],
    maxLength: [200, "Subject cannot exceed 200 Characters!"],
  },
  content: {
    type: String,
    required: [true, "Please enter message content!"],
    minLength: [10, "Message content must contain at least 10 Characters!"],
    maxLength: [2000, "Message content cannot exceed 2000 Characters!"],
  },
  relatedCertificate: {
    type: mongoose.Schema.ObjectId,
    ref: "Certificate",
    default: null, // Optional, in case the message is related to a specific certificate
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  messageType: {
    type: String,
    enum: ["recruitment_inquiry", "general", "interview_invite"],
    default: "general",
  },
  attachments: [{
    public_id: {
      type: String,
    },
    url: {
      type: String,
    },
    filename: {
      type: String,
    },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  readAt: {
    type: Date,
    default: null,
  },
});

// Add indexes for better performance
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ receiver: 1, isRead: 1 });
messageSchema.index({ createdAt: -1 });

export const Message = mongoose.model("Message", messageSchema);