import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { 
  Notification, 
  NotificationPreferences, 
  EmailQueue, 
  SocketConnection, 
  NotificationTemplate 
} from "../models/notificationSchema.js";
import { User } from "../models/userSchema.js";
import ErrorHandler from "../middlewares/error.js";

// ============ NOTIFICATION MANAGEMENT ============

// Get user notifications
export const getNotifications = catchAsyncError(async (req, res, next) => {
  const userId = req.user.id;
  const { 
    page = 1, 
    limit = 20, 
    category, 
    isRead, 
    priority,
    markAsRead = false 
  } = req.query;

  // Build filter
  let filter = { 
    recipient: userId, 
    isArchived: false 
  };
  
  if (category) filter.category = category;
  if (isRead !== undefined) filter.isRead = isRead === 'true';
  if (priority) filter.priority = priority;

  const notifications = await Notification.find(filter)
    .populate('sender', 'name profilePhoto')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  // Mark all as read if requested
  if (markAsRead === 'true' && notifications.length > 0) {
    const notificationIds = notifications.map(n => n._id);
    await Notification.updateMany(
      { _id: { $in: notificationIds }, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  // Get unread count
  const unreadCount = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
    isArchived: false
  });

  res.status(200).json({
    success: true,
    notifications,
    unreadCount,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(notifications.length / limit),
      hasNext: notifications.length === limit
    }
  });
});

// Mark notification as read
export const markNotificationAsRead = catchAsyncError(async (req, res, next) => {
  const { notificationId } = req.params;
  const userId = req.user.id;

  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId
  });

  if (!notification) {
    return next(new ErrorHandler("Notification not found!", 404));
  }

  await notification.markAsRead();

  res.status(200).json({
    success: true,
    message: "Notification marked as read",
    notification
  });
});

// Mark all notifications as read
export const markAllAsRead = catchAsyncError(async (req, res, next) => {
  const userId = req.user.id;

  await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  res.status(200).json({
    success: true,
    message: "All notifications marked as read"
  });
});

// Archive notification
export const archiveNotification = catchAsyncError(async (req, res, next) => {
  const { notificationId } = req.params;
  const userId = req.user.id;

  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId
  });

  if (!notification) {
    return next(new ErrorHandler("Notification not found!", 404));
  }

  await notification.archive();

  res.status(200).json({
    success: true,
    message: "Notification archived"
  });
});

// Delete notification
export const deleteNotification = catchAsyncError(async (req, res, next) => {
  const { notificationId } = req.params;
  const userId = req.user.id;

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId
  });

  if (!notification) {
    return next(new ErrorHandler("Notification not found!", 404));
  }

  res.status(200).json({
    success: true,
    message: "Notification deleted"
  });
});

// Get notification statistics
export const getNotificationStats = catchAsyncError(async (req, res, next) => {
  const userId = req.user.id;

  const stats = await Notification.aggregate([
    { $match: { recipient: userId, isArchived: false } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: { $sum: { $cond: ['$isRead', 0, 1] } },
        byCategory: {
          $push: {
            category: '$category',
            isRead: '$isRead'
          }
        },
        byPriority: {
          $push: {
            priority: '$priority',
            isRead: '$isRead'
          }
        }
      }
    }
  ]);

  // Process category and priority stats
  let categoryStats = {};
  let priorityStats = {};

  if (stats.length > 0) {
    const data = stats[0];
    
    // Category statistics
    data.byCategory.forEach(item => {
      if (!categoryStats[item.category]) {
        categoryStats[item.category] = { total: 0, unread: 0 };
      }
      categoryStats[item.category].total++;
      if (!item.isRead) categoryStats[item.category].unread++;
    });

    // Priority statistics
    data.byPriority.forEach(item => {
      if (!priorityStats[item.priority]) {
        priorityStats[item.priority] = { total: 0, unread: 0 };
      }
      priorityStats[item.priority].total++;
      if (!item.isRead) priorityStats[item.priority].unread++;
    });
  }

  res.status(200).json({
    success: true,
    stats: {
      total: stats.length > 0 ? stats[0].total : 0,
      unread: stats.length > 0 ? stats[0].unread : 0,
      categoryStats,
      priorityStats
    }
  });
});

// ============ NOTIFICATION PREFERENCES ============

// Get notification preferences
export const getNotificationPreferences = catchAsyncError(async (req, res, next) => {
  const userId = req.user.id;

  let preferences = await NotificationPreferences.findOne({ user: userId });
  
  if (!preferences) {
    // Create default preferences
    preferences = await NotificationPreferences.create({ user: userId });
  }

  res.status(200).json({
    success: true,
    preferences
  });
});

// Update notification preferences
export const updateNotificationPreferences = catchAsyncError(async (req, res, next) => {
  const userId = req.user.id;
  const { preferences, quietHours } = req.body;

  const updatedPreferences = await NotificationPreferences.findOneAndUpdate(
    { user: userId },
    { preferences, quietHours },
    { new: true, upsert: true }
  );

  res.status(200).json({
    success: true,
    message: "Notification preferences updated successfully",
    preferences: updatedPreferences
  });
});

// ============ NOTIFICATION CREATION ============

// Create notification (internal use)
export const createNotification = async (notificationData) => {
  try {
    const notification = await Notification.create(notificationData);
    
    // Send real-time notification
    await sendRealTimeNotification(notification);
    
    // Queue email notification if enabled
    await queueEmailNotification(notification);
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Create notification from template
export const createNotificationFromTemplate = async (templateType, recipientId, data = {}) => {
  try {
    const notification = await Notification.createFromTemplate(templateType, recipientId, data);
    
    // Send real-time notification
    await sendRealTimeNotification(notification);
    
    // Queue email notification if enabled
    await queueEmailNotification(notification);
    
    return notification;
  } catch (error) {
    console.error('Error creating notification from template:', error);
    throw error;
  }
};

// ============ REAL-TIME NOTIFICATIONS ============

// Send real-time notification via WebSocket
export const sendRealTimeNotification = async (notification) => {
  try {
    // Find active socket connections for the recipient
    const connections = await SocketConnection.find({
      user: notification.recipient,
      isActive: true
    });

    if (connections.length > 0 && global.io) {
      const notificationData = await Notification.findById(notification._id)
        .populate('sender', 'name profilePhoto');

      connections.forEach(connection => {
        global.io.to(connection.socketId).emit('new_notification', {
          notification: notificationData,
          unreadCount: global.unreadCounts?.[notification.recipient] || 0
        });
      });
    }
  } catch (error) {
    console.error('Error sending real-time notification:', error);
  }
};

// Handle WebSocket connection
export const handleSocketConnection = async (socket, userId) => {
  try {
    // Store connection
    await SocketConnection.create({
      user: userId,
      socketId: socket.id,
      deviceInfo: {
        userAgent: socket.handshake.headers['user-agent'],
        ipAddress: socket.handshake.address
      }
    });

    // Send current unread count
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
      isArchived: false
    });

    socket.emit('unread_count', { count: unreadCount });

    // Handle disconnection
    socket.on('disconnect', async () => {
      await SocketConnection.findOneAndUpdate(
        { socketId: socket.id },
        { isActive: false }
      );
    });

    // Handle mark as read
    socket.on('mark_notification_read', async (notificationId) => {
      await Notification.findByIdAndUpdate(notificationId, {
        isRead: true,
        readAt: new Date()
      });

      const newUnreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
        isArchived: false
      });

      socket.emit('unread_count', { count: newUnreadCount });
    });

  } catch (error) {
    console.error('Error handling socket connection:', error);
  }
};

// ============ EMAIL NOTIFICATIONS ============

// Queue email notification
export const queueEmailNotification = async (notification) => {
  try {
    // Check user preferences
    const preferences = await NotificationPreferences.findOne({
      user: notification.recipient
    });

    if (!preferences?.preferences?.email?.enabled) {
      return; // Email notifications disabled
    }

    // Check if this notification type should trigger email
    const emailType = getEmailTypeForNotification(notification.type);
    if (!emailType || !shouldSendEmailForType(preferences, notification.type)) {
      return;
    }

    // Get email template
    const template = await NotificationTemplate.findOne({
      type: notification.type,
      isActive: true
    });

    if (!template?.emailTemplate) {
      return; // No email template available
    }

    // Queue email
    await EmailQueue.create({
      recipient: notification.recipient,
      emailType,
      subject: template.emailSubject || notification.title,
      htmlContent: template.emailTemplate,
      templateData: {
        notification: notification.toObject(),
        user: notification.recipient
      },
      priority: notification.priority === 'urgent' ? 'high' : 'medium'
    });

  } catch (error) {
    console.error('Error queuing email notification:', error);
  }
};

// ============ NOTIFICATION TEMPLATES ============

// Get notification templates
export const getNotificationTemplates = catchAsyncError(async (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return next(new ErrorHandler("Access denied. Admin only.", 403));
  }

  const templates = await NotificationTemplate.find({ isActive: true });

  res.status(200).json({
    success: true,
    templates
  });
});

// Create notification template
export const createNotificationTemplate = catchAsyncError(async (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return next(new ErrorHandler("Access denied. Admin only.", 403));
  }

  const template = await NotificationTemplate.create(req.body);

  res.status(201).json({
    success: true,
    message: "Notification template created successfully",
    template
  });
});

// Update notification template
export const updateNotificationTemplate = catchAsyncError(async (req, res, next) => {
  const { templateId } = req.params;

  if (req.user.role !== 'Admin') {
    return next(new ErrorHandler("Access denied. Admin only.", 403));
  }

  const template = await NotificationTemplate.findByIdAndUpdate(
    templateId,
    { ...req.body, updatedAt: new Date() },
    { new: true }
  );

  if (!template) {
    return next(new ErrorHandler("Template not found!", 404));
  }

  res.status(200).json({
    success: true,
    message: "Notification template updated successfully",
    template
  });
});

// ============ HELPER FUNCTIONS ============

function getEmailTypeForNotification(notificationType) {
  const emailTypeMap = {
    'job_match': 'job_alert',
    'job_application': 'application_confirmation',
    'application_status_change': 'notification_immediate',
    'interview_scheduled': 'interview_reminder',
    'connection_request': 'notification_immediate',
    'connection_accepted': 'notification_immediate',
    'skill_endorsed': 'notification_immediate',
    'recommendation_request': 'notification_immediate',
    'recommendation_received': 'notification_immediate',
    'assessment_invitation': 'notification_immediate',
    'assessment_completed': 'notification_immediate',
    'skill_verified': 'notification_immediate'
  };

  return emailTypeMap[notificationType] || 'notification_immediate';
}

function shouldSendEmailForType(preferences, notificationType) {
  const emailPrefs = preferences.preferences.email;
  
  const typeMap = {
    'job_match': 'jobMatches',
    'job_application': 'applicationUpdates',
    'application_status_change': 'applicationUpdates',
    'connection_request': 'connectionRequests',
    'connection_accepted': 'connectionRequests',
    'skill_endorsed': 'endorsements',
    'recommendation_request': 'recommendations',
    'recommendation_received': 'recommendations',
    'assessment_invitation': 'assessmentInvitations',
    'assessment_completed': 'assessmentInvitations'
  };

  const prefKey = typeMap[notificationType];
  return !prefKey || emailPrefs[prefKey] !== false;
}

// Bulk notification service for system announcements
export const sendBulkNotification = catchAsyncError(async (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return next(new ErrorHandler("Access denied. Admin only.", 403));
  }

  const { 
    userIds, 
    userRole, 
    title, 
    message, 
    category = 'system',
    priority = 'medium',
    expiresInDays 
  } = req.body;

  let recipients = [];

  if (userIds && Array.isArray(userIds)) {
    recipients = userIds;
  } else if (userRole) {
    const users = await User.find({ role: userRole }).select('_id');
    recipients = users.map(u => u._id);
  } else {
    return next(new ErrorHandler("Please specify userIds or userRole", 400));
  }

  const expiresAt = expiresInDays ? 
    new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : 
    undefined;

  // Create notifications for all recipients
  const notifications = recipients.map(recipientId => ({
    recipient: recipientId,
    sender: req.user.id,
    type: 'system_announcement',
    title,
    message,
    category,
    priority,
    expiresAt
  }));

  const createdNotifications = await Notification.insertMany(notifications);

  // Send real-time notifications
  for (const notification of createdNotifications) {
    await sendRealTimeNotification(notification);
  }

  res.status(200).json({
    success: true,
    message: `Bulk notification sent to ${recipients.length} users`,
    count: recipients.length
  });
});