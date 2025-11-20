import mongoose from "mongoose";

// Connection Schema
const connectionSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  recipient: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "declined", "blocked"],
    default: "pending"
  },
  message: {
    type: String,
    maxLength: [300, "Connection message cannot exceed 300 characters"]
  },
  connectedAt: {
    type: Date
  },
  requestedAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent duplicate connections
connectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Endorsement Schema
const endorsementSchema = new mongoose.Schema({
  endorser: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  endorsee: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  skillName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    maxLength: [200, "Endorsement message cannot exceed 200 characters"]
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  endorsedAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent multiple endorsements for same skill by same person
endorsementSchema.index({ endorser: 1, endorsee: 1, skillName: 1 }, { unique: true });

// Recommendation Schema
const recommendationSchema = new mongoose.Schema({
  recommender: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  recommendee: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  relationship: {
    type: String,
    enum: ["colleague", "manager", "direct_report", "client", "vendor", "mentor", "student"],
    required: true
  },
  workContext: {
    company: { type: String },
    position: { type: String },
    duration: {
      from: { type: Date },
      to: { type: Date }
    }
  },
  recommendation: {
    type: String,
    required: true,
    minLength: [50, "Recommendation must be at least 50 characters"],
    maxLength: [1000, "Recommendation cannot exceed 1000 characters"]
  },
  skills: [String], // Skills highlighted in the recommendation
  status: {
    type: String,
    enum: ["pending", "approved", "declined", "archived"],
    default: "pending"
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date
  }
});

// Professional Feed/Activity Schema
const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: [
      "job_posted", 
      "job_applied", 
      "connection_made", 
      "skill_endorsed", 
      "recommendation_given", 
      "profile_updated",
      "article_shared",
      "achievement_unlocked",
      "work_anniversary"
    ],
    required: true
  },
  content: {
    title: { type: String, required: true },
    description: { type: String },
    link: { type: String },
    image: {
      public_id: { type: String },
      url: { type: String }
    }
  },
  relatedEntities: {
    job: { type: mongoose.Schema.ObjectId, ref: "Job" },
    user: { type: mongoose.Schema.ObjectId, ref: "User" },
    company: { type: mongoose.Schema.ObjectId, ref: "User" }
  },
  visibility: {
    type: String,
    enum: ["public", "connections", "private"],
    default: "public"
  },
  likes: [{
    user: { type: mongoose.Schema.ObjectId, ref: "User" },
    likedAt: { type: Date, default: Date.now }
  }],
  comments: [{
    user: { type: mongoose.Schema.ObjectId, ref: "User" },
    content: { type: String, required: true, maxLength: 500 },
    commentedAt: { type: Date, default: Date.now }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Follow Schema (for following companies and people)
const followSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  following: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  followType: {
    type: String,
    enum: ["user", "company"],
    required: true
  },
  followedAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent duplicate follows
followSchema.index({ follower: 1, following: 1 }, { unique: true });

// Company Review Schema
const companyReviewSchema = new mongoose.Schema({
  reviewer: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  company: {
    type: mongoose.Schema.ObjectId,
    ref: "User", // Company user account
    required: true
  },
  employment: {
    position: { type: String, required: true },
    employmentType: { 
      type: String, 
      enum: ["current", "former"],
      required: true 
    },
    duration: {
      from: { type: Date },
      to: { type: Date }
    }
  },
  ratings: {
    overall: { type: Number, min: 1, max: 5, required: true },
    workLifeBalance: { type: Number, min: 1, max: 5 },
    culture: { type: Number, min: 1, max: 5 },
    careerOpportunities: { type: Number, min: 1, max: 5 },
    compensation: { type: Number, min: 1, max: 5 },
    management: { type: Number, min: 1, max: 5 }
  },
  review: {
    pros: { type: String, maxLength: 1000 },
    cons: { type: String, maxLength: 1000 },
    advice: { type: String, maxLength: 500 }
  },
  wouldRecommend: {
    type: Boolean,
    required: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  helpful: [{
    user: { type: mongoose.Schema.ObjectId, ref: "User" },
    markedAt: { type: Date, default: Date.now }
  }],
  reported: [{
    user: { type: mongoose.Schema.ObjectId, ref: "User" },
    reason: { type: String },
    reportedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ["active", "flagged", "removed"],
    default: "active"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Connection = mongoose.model("Connection", connectionSchema);
export const Endorsement = mongoose.model("Endorsement", endorsementSchema);
export const Recommendation = mongoose.model("Recommendation", recommendationSchema);
export const Activity = mongoose.model("Activity", activitySchema);
export const Follow = mongoose.model("Follow", followSchema);
export const CompanyReview = mongoose.model("CompanyReview", companyReviewSchema);