import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { EmailQueue } from "../models/notificationSchema.js";
import { User } from "../models/userSchema.js";
import emailService from "../services/emailService.js";
import emailQueueProcessor from "../services/emailQueueProcessor.js";
import ErrorHandler from "../middlewares/error.js";

// Test email configuration
export const testEmailConfiguration = catchAsyncErrors(async (req, res, next) => {
  // Skip auth for development testing
  if (process.env.NODE_ENV !== 'development' && (!req.user || req.user.role !== 'Admin')) {
    return next(new ErrorHandler("Access denied. Admin only.", 403));
  }

  try {
    const result = await emailService.testEmailConfiguration();
    
    res.status(200).json({
      success: true,
      message: "Email test sent successfully",
      result
    });
  } catch (error) {
    return next(new ErrorHandler(`Email test failed: ${error.message}`, 500));
  }
});

// Send welcome email manually (for testing)
export const sendWelcomeEmail = catchAsyncError(async (req, res, next) => {
  const { userId } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  try {
    await emailQueueProcessor.queueWelcomeEmail(user);
    
    res.status(200).json({
      success: true,
      message: "Welcome email queued successfully"
    });
  } catch (error) {
    return next(new ErrorHandler(`Failed to queue welcome email: ${error.message}`, 500));
  }
});

// Send password reset email
export const sendPasswordResetEmail = catchAsyncError(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Generate reset token (this should be implemented in your auth system)
  const resetToken = 'sample_reset_token_' + Date.now();

  try {
    await emailQueueProcessor.queuePasswordResetEmail(user, resetToken);
    
    res.status(200).json({
      success: true,
      message: "Password reset email queued successfully"
    });
  } catch (error) {
    return next(new ErrorHandler(`Failed to queue password reset email: ${error.message}`, 500));
  }
});

// Send job alert email
export const sendJobAlertEmail = catchAsyncError(async (req, res, next) => {
  const { userId, jobs } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  if (!jobs || jobs.length === 0) {
    return next(new ErrorHandler("Jobs array is required", 400));
  }

  try {
    await emailQueueProcessor.queueJobAlertEmail(user, jobs);
    
    res.status(200).json({
      success: true,
      message: "Job alert email queued successfully"
    });
  } catch (error) {
    return next(new ErrorHandler(`Failed to queue job alert email: ${error.message}`, 500));
  }
});

// Get email queue statistics
export const getEmailQueueStats = catchAsyncError(async (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return next(new ErrorHandler("Access denied. Admin only.", 403));
  }

  const stats = await emailQueueProcessor.getQueueStats();
  
  res.status(200).json({
    success: true,
    stats
  });
});

// Get email queue jobs
export const getEmailQueueJobs = catchAsyncError(async (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return next(new ErrorHandler("Access denied. Admin only.", 403));
  }

  const { 
    page = 1, 
    limit = 20, 
    status, 
    emailType,
    recipient 
  } = req.query;

  let filter = {};
  if (status) filter.status = status;
  if (emailType) filter.emailType = emailType;
  if (recipient) filter.recipient = recipient;

  const emailJobs = await EmailQueue.find(filter)
    .populate('recipient', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const totalJobs = await EmailQueue.countDocuments(filter);

  res.status(200).json({
    success: true,
    emailJobs,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalJobs / limit),
      totalJobs,
      hasNext: (page * limit) < totalJobs,
      hasPrev: page > 1
    }
  });
});

// Retry failed email
export const retryFailedEmail = catchAsyncError(async (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return next(new ErrorHandler("Access denied. Admin only.", 403));
  }

  const { emailId } = req.params;

  const emailJob = await EmailQueue.findById(emailId);
  if (!emailJob) {
    return next(new ErrorHandler("Email job not found", 404));
  }

  if (emailJob.status !== 'failed') {
    return next(new ErrorHandler("Only failed emails can be retried", 400));
  }

  // Reset the email job for retry
  emailJob.status = 'pending';
  emailJob.attempts = 0;
  emailJob.scheduledFor = new Date();
  emailJob.failureReason = undefined;

  await emailJob.save();

  res.status(200).json({
    success: true,
    message: "Email job queued for retry"
  });
});

// Cancel pending email
export const cancelEmail = catchAsyncError(async (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return next(new ErrorHandler("Access denied. Admin only.", 403));
  }

  const { emailId } = req.params;

  const emailJob = await EmailQueue.findById(emailId);
  if (!emailJob) {
    return next(new ErrorHandler("Email job not found", 404));
  }

  if (!['pending', 'processing'].includes(emailJob.status)) {
    return next(new ErrorHandler("Only pending or processing emails can be cancelled", 400));
  }

  emailJob.status = 'cancelled';
  emailJob.failureReason = 'Cancelled by admin';

  await emailJob.save();

  res.status(200).json({
    success: true,
    message: "Email job cancelled successfully"
  });
});

// Send custom email (for admin use)
export const sendCustomEmail = catchAsyncError(async (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return next(new ErrorHandler("Access denied. Admin only.", 403));
  }

  const {
    recipients, // Array of user IDs or email addresses
    subject,
    template,
    templateData,
    html,
    text,
    priority = 'medium',
    scheduledFor
  } = req.body;

  if (!recipients || recipients.length === 0) {
    return next(new ErrorHandler("Recipients are required", 400));
  }

  if (!subject) {
    return next(new ErrorHandler("Subject is required", 400));
  }

  try {
    const emailJobs = [];

    for (const recipient of recipients) {
      let recipientId = recipient;
      let recipientEmail = recipient;

      // If recipient is a user ID, get the user's email
      if (recipient.match(/^[0-9a-fA-F]{24}$/)) {
        const user = await User.findById(recipient);
        if (user) {
          recipientId = user._id;
          recipientEmail = user.email;
        } else {
          continue; // Skip invalid user IDs
        }
      }

      let emailContent = html;
      if (template && templateData) {
        emailContent = await emailService.compileTemplate(template, templateData);
      }

      const emailJob = await EmailQueue.create({
        recipient: recipientId,
        emailType: 'custom',
        subject,
        htmlContent: emailContent,
        textContent: text,
        templateData,
        priority,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date()
      });

      emailJobs.push(emailJob);
    }

    res.status(200).json({
      success: true,
      message: `${emailJobs.length} custom emails queued successfully`,
      count: emailJobs.length
    });

  } catch (error) {
    return next(new ErrorHandler(`Failed to queue custom emails: ${error.message}`, 500));
  }
});

// Get email templates
export const getEmailTemplates = catchAsyncError(async (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return next(new ErrorHandler("Access denied. Admin only.", 403));
  }

  // This would list available email templates
  const templates = [
    {
      name: 'welcome',
      description: 'Welcome email for new users',
      variables: ['name', 'dashboardUrl', 'profileCompleteness', 'supportUrl']
    },
    {
      name: 'password-reset',
      description: 'Password reset email',
      variables: ['name', 'resetUrl', 'expirationTime', 'requestTime', 'ipAddress', 'userAgent', 'supportUrl']
    },
    {
      name: 'job-alert',
      description: 'Job alert email with matching jobs',
      variables: ['name', 'jobCount', 'jobs', 'hasMoreJobs', 'totalJobs', 'profileCompleteness', 'allJobsUrl', 'profileUrl', 'unsubscribeUrl']
    },
    {
      name: 'connection-request',
      description: 'Professional connection request notification',
      variables: ['name', 'requesterName', 'requesterHeadline', 'message', 'profileUrl', 'acceptUrl', 'declineUrl']
    },
    {
      name: 'skill-endorsement',
      description: 'Skill endorsement notification',
      variables: ['name', 'endorserName', 'skillName', 'message', 'profileUrl']
    },
    {
      name: 'weekly-digest',
      description: 'Weekly activity digest',
      variables: ['name', 'weekStart', 'weekEnd', 'newJobs', 'applications', 'connections', 'profileViews']
    }
  ];

  res.status(200).json({
    success: true,
    templates
  });
});

// Preview email template
export const previewEmailTemplate = catchAsyncError(async (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return next(new ErrorHandler("Access denied. Admin only.", 403));
  }

  const { template, templateData } = req.body;

  if (!template) {
    return next(new ErrorHandler("Template name is required", 400));
  }

  try {
    const htmlContent = await emailService.compileTemplate(template, templateData || {});
    
    res.status(200).json({
      success: true,
      htmlContent,
      textContent: emailService.htmlToText(htmlContent)
    });
  } catch (error) {
    return next(new ErrorHandler(`Failed to preview template: ${error.message}`, 500));
  }
});

// Email delivery webhook (for SendGrid/AWS SES)
export const handleEmailWebhook = catchAsyncError(async (req, res, next) => {
  const events = req.body;

  if (!Array.isArray(events)) {
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }

  for (const event of events) {
    try {
      // Handle different email events
      switch (event.event) {
        case 'delivered':
          // Update email status to delivered
          break;
        case 'bounce':
        case 'dropped':
          // Handle bounced/dropped emails
          console.log(`Email bounced: ${event.email}`, event.reason);
          break;
        case 'open':
          // Track email opens
          console.log(`Email opened: ${event.email}`);
          break;
        case 'click':
          // Track email clicks
          console.log(`Email clicked: ${event.email}`, event.url);
          break;
        case 'unsubscribe':
          // Handle unsubscribes
          console.log(`User unsubscribed: ${event.email}`);
          // Update user's email preferences
          break;
      }
    } catch (error) {
      console.error('Error processing webhook event:', error);
    }
  }

  res.status(200).json({ success: true });
});

// Email analytics and reporting
export const getEmailAnalytics = catchAsyncError(async (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return next(new ErrorHandler("Access denied. Admin only.", 403));
  }

  const { startDate, endDate, emailType } = req.query;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
  }

  let filter = { ...dateFilter };
  if (emailType) filter.emailType = emailType;

  // Get email statistics
  const stats = await EmailQueue.aggregate([
    { $match: filter },
    {
      $group: {
        _id: {
          status: '$status',
          emailType: '$emailType'
        },
        count: { $sum: 1 },
        totalAttempts: { $sum: '$attempts' }
      }
    },
    {
      $group: {
        _id: '$_id.emailType',
        stats: {
          $push: {
            status: '$_id.status',
            count: '$count',
            totalAttempts: '$totalAttempts'
          }
        },
        total: { $sum: '$count' }
      }
    }
  ]);

  // Calculate success rates
  const analytics = stats.map(stat => {
    const sent = stat.stats.find(s => s.status === 'sent')?.count || 0;
    const failed = stat.stats.find(s => s.status === 'failed')?.count || 0;
    const pending = stat.stats.find(s => s.status === 'pending')?.count || 0;
    const cancelled = stat.stats.find(s => s.status === 'cancelled')?.count || 0;

    return {
      emailType: stat._id,
      total: stat.total,
      sent,
      failed,
      pending,
      cancelled,
      successRate: stat.total > 0 ? ((sent / stat.total) * 100).toFixed(2) : 0
    };
  });

  res.status(200).json({
    success: true,
    analytics,
    summary: {
      totalEmails: stats.reduce((sum, stat) => sum + stat.total, 0),
      totalSent: analytics.reduce((sum, stat) => sum + stat.sent, 0),
      totalFailed: analytics.reduce((sum, stat) => sum + stat.failed, 0),
      overallSuccessRate: analytics.length > 0 ? 
        (analytics.reduce((sum, stat) => sum + parseFloat(stat.successRate), 0) / analytics.length).toFixed(2) : 0
    }
  });
});