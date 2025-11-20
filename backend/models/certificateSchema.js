import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Please enter certificate title!"],
    minLength: [3, "Certificate title must contain at least 3 Characters!"],
    maxLength: [100, "Certificate title cannot exceed 100 Characters!"],
  },
  description: {
    type: String,
    required: [true, "Please enter certificate description!"],
    minLength: [10, "Certificate description must contain at least 10 Characters!"],
    maxLength: [1000, "Certificate description cannot exceed 1000 Characters!"],
  },
  issuingOrganization: {
    type: String,
    required: [true, "Please enter the issuing organization!"],
    minLength: [3, "Issuing organization must contain at least 3 Characters!"],
    maxLength: [100, "Issuing organization cannot exceed 100 Characters!"],
  },
  issueDate: {
    type: Date,
    required: [true, "Please enter the issue date!"],
  },
  expiryDate: {
    type: Date,
    default: null, // Some certificates don't expire
  },
  certificateUrl: {
    public_id: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
  credentialId: {
    type: String,
    default: null, // Some certificates have credential IDs
  },
  skills: [
    {
      type: String,
      trim: true,
    }
  ],
  postedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  views: {
    type: Number,
    default: 0,
  },
  likes: [{
    type: mongoose.Schema.ObjectId,
    ref: "User",
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add indexes for better performance
certificateSchema.index({ postedBy: 1 });
certificateSchema.index({ skills: 1 });
certificateSchema.index({ createdAt: -1 });

export const Certificate = mongoose.model("Certificate", certificateSchema);