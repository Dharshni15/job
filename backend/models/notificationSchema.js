import mongoose from "mongoose";

// Notification Schema
const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: "User"
  },
  type: {
    type: String,
    enum: [
      // Job-related
      "job_match", "job_application", "application_status_change", "interview_scheduled",
      // Networking
      "connection_request", "connection_accepted", "skill_endorsed", "recommendation_request", "recommendation_received",
      // Assessment
      "assessment_invitation", "assessment_completed", "skill_verified",
      // System
      "profile_viewed", "message_received", "system_announcement",
      // Activity
      "activity_liked", "activity_commented", "new_follower"
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxLength: 200
  },
  message: {
    type: String,
    required: true,
    maxLength: 500
  },
  data: {
    // Flexible field to store type-specific data
    jobId: { type: mongoose.Schema.ObjectId, ref: "Job" },
    applicationId: { type: mongoose.Schema.ObjectId, ref: "Application" },
    connectionId: { type: mongoose.Schema.ObjectId, ref: "Connection" },
    assessmentId: { type: mongoose.Schema.ObjectId, ref: "SkillAssessment" },
    activityId: { type: mongoose.Schema.ObjectId, ref: "Activity" },
    interviewId: { type: mongoose.Schema.ObjectId, ref: "InterviewAssessment" },
    url: { type: String }, // Deep link URL
    metadata: mongoose.Schema.Types.Mixed // Additional flexible data
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium"
  },
  category: {
    type: String,
    enum: ["job", "network", "assessment", "system", "activity"],
    required: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  }
});

// Compound indexes for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, category: 1, createdAt: -1 });

// Notification Preferences Schema
const notificationPreferencesSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  preferences: {
    // Email notifications
    email: {
      enabled: { type: Boolean, default: true },
      jobMatches: { type: Boolean, default: true },
      applicationUpdates: { type: Boolean, default: true },
      connectionRequests: { type: Boolean, default: true },
      endorsements: { type: Boolean, default: true },
      recommendations: { type: Boolean, default: true },
      assessmentInvitations: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: true },
      frequency: { type: String, enum: ["immediate", "daily", "weekly"], default: "immediate" }
    },
    // Push notifications (for web/mobile app)
    push: {
      enabled: { type: Boolean, default: true },
      jobMatches: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      connectionRequests: { type: Boolean, default: true },
      interviewReminders: { type: Boolean, default: true },
      applicationUpdates: { type: Boolean, default: true }
    },
    // In-app notifications
    inApp: {
      enabled: { type: Boolean, default: true },
      showOnDashboard: { type: Boolean, default: true },
      autoMarkAsRead: { type: Boolean, default: false },
      retentionDays: { type: Number, default: 30 }
    }
  },
  quietHours: {
    enabled: { type: Boolean, default: false },
    startTime: { type: String, default: "22:00" }, // 24-hour format
    endTime: { type: String, default: "08:00" },
    timezone: { type: String, default: "UTC" }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Email Queue Schema (for batch email processing)
const emailQueueSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  emailType: {
    type: String,
    enum: [
      "notification_immediate", "daily_digest", "weekly_digest", 
      "welcome", "password_reset", "account_verification",
      "job_alert", "application_confirmation", "interview_reminder"
    ],
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  htmlContent: {
    type: String,
    required: true
  },
  textContent: {
    type: String
  },
  templateData: {
    type: mongoose.Schema.Types.Mixed
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium"
  },
  status: {
    type: String,
    enum: ["pending", "processing", "sent", "failed", "cancelled"],
    default: "pending",
    index: true
  },
  scheduledFor: {
    type: Date,
    default: Date.now,
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastAttempt: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  failureReason: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Real-time Socket Connection Schema (for active WebSocket connections)
const socketConnectionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  socketId: {
    type: String,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deviceInfo: {
    userAgent: { type: String },
    platform: { type: String },
    browser: { type: String },
    ipAddress: { type: String }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  connectedAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-cleanup inactive connections after 1 hour
socketConnectionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 3600 });

// Notification Template Schema
const notificationTemplateSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  emailSubject: {
    type: String
  },
  emailTemplate: {
    type: String
  },
  variables: [{
    name: { type: String, required: true },
    description: { type: String },
    required: { type: Boolean, default: false }
  }],
  category: {
    type: String,
    enum: ["job", "network", "assessment", "system", "activity"],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Methods for Notification Schema
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.archive = function() {
  this.isArchived = true;
  return this.save();
};

// Static method to create notification with template
notificationSchema.statics.createFromTemplate = async function(templateType, recipientId, data = {}) {
  const NotificationTemplate = mongoose.model('NotificationTemplate');
  const template = await NotificationTemplate.findOne({ type: templateType, isActive: true });
  
  if (!template) {
    throw new Error(`Notification template '${templateType}' not found`);
  }

  // Replace template variables
  let title = template.title;
  let message = template.message;
  
  Object.keys(data).forEach(key => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    title = title.replace(placeholder, data[key] || '');
    message = message.replace(placeholder, data[key] || '');
  });

  return this.create({
    recipient: recipientId,
    type: templateType,
    title,
    message,
    category: template.category,
    data: data.notificationData || {},
    priority: data.priority || 'medium'
  });
};

// Pre-save middleware for notification preferences
notificationPreferencesSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for unread notifications count
notificationSchema.virtual('isUnread').get(function() {
  return !this.isRead;
});

export const Notification = mongoose.model("Notification", notificationSchema);
export const NotificationPreferences = mongoose.model("NotificationPreferences", notificationPreferencesSchema);
export const EmailQueue = mongoose.model("EmailQueue", emailQueueSchema);
export const SocketConnection = mongoose.model("SocketConnection", socketConnectionSchema);
export const NotificationTemplate = mongoose.model("NotificationTemplate", notificationTemplateSchema);