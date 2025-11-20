import cron from 'node-cron';
import { EmailQueue, NotificationPreferences } from '../models/notificationSchema.js';
import { User } from '../models/userSchema.js';
import emailService from './emailService.js';

class EmailQueueProcessor {
  constructor() {
    this.isProcessing = false;
    this.batchSize = 10;
    this.retryAttempts = 3;
    this.retryDelay = 5 * 60 * 1000; // 5 minutes
  }

  // Start the email queue processor
  start() {
    console.log('🚀 Starting email queue processor...');
    
    // Process emails every minute
    cron.schedule('* * * * *', () => {
      this.processQueue();
    });

    // Generate daily digest emails at 8 AM
    cron.schedule('0 8 * * *', () => {
      this.generateDailyDigests();
    });

    // Generate weekly digest emails on Sunday at 9 AM
    cron.schedule('0 9 * * 0', () => {
      this.generateWeeklyDigests();
    });

    // Cleanup old emails (older than 7 days)
    cron.schedule('0 2 * * *', () => {
      this.cleanupOldEmails();
    });

    console.log('✅ Email queue processor started with scheduled jobs');
  }

  // Process pending emails in the queue
  async processQueue() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Get pending emails that are ready to send
      const pendingEmails = await EmailQueue.find({
        status: 'pending',
        scheduledFor: { $lte: new Date() },
        attempts: { $lt: this.retryAttempts }
      })
      .populate('recipient', 'name email')
      .limit(this.batchSize)
      .sort({ priority: -1, createdAt: 1 });

      if (pendingEmails.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`📧 Processing ${pendingEmails.length} emails from queue`);

      // Process each email
      for (const emailJob of pendingEmails) {
        await this.processEmailJob(emailJob);
        
        // Small delay between emails to avoid overwhelming the service
        await this.delay(100);
      }

    } catch (error) {
      console.error('Error processing email queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Process individual email job
  async processEmailJob(emailJob) {
    try {
      // Mark as processing
      emailJob.status = 'processing';
      emailJob.attempts += 1;
      emailJob.lastAttempt = new Date();
      await emailJob.save();

      // Check if user has opted out of this email type
      const preferences = await NotificationPreferences.findOne({
        user: emailJob.recipient._id
      });

      if (this.shouldSkipEmail(emailJob, preferences)) {
        emailJob.status = 'cancelled';
        emailJob.failureReason = 'User has opted out of this email type';
        await emailJob.save();
        return;
      }

      // Compile template data if needed
      let templateData = emailJob.templateData || {};
      if (emailJob.recipient) {
        templateData.user = emailJob.recipient;
        templateData.name = emailJob.recipient.name;
      }

      // Send the email
      const result = await emailService.sendEmail({
        to: emailJob.recipient.email,
        subject: emailJob.subject,
        html: emailJob.htmlContent,
        text: emailJob.textContent,
        templateData,
        priority: emailJob.priority
      });

      // Mark as sent
      emailJob.status = 'sent';
      emailJob.sentAt = new Date();
      await emailJob.save();

      console.log(`✅ Email sent successfully to ${emailJob.recipient.email}`);

    } catch (error) {
      console.error(`❌ Failed to send email to ${emailJob.recipient.email}:`, error.message);
      
      // Mark as failed if max attempts reached
      if (emailJob.attempts >= this.retryAttempts) {
        emailJob.status = 'failed';
        emailJob.failureReason = error.message;
      } else {
        // Schedule retry
        emailJob.status = 'pending';
        emailJob.scheduledFor = new Date(Date.now() + this.retryDelay);
      }
      
      await emailJob.save();
    }
  }

  // Check if email should be skipped based on user preferences
  shouldSkipEmail(emailJob, preferences) {
    if (!preferences || !preferences.preferences.email.enabled) {
      return true;
    }

    const emailType = emailJob.emailType;
    const emailPrefs = preferences.preferences.email;

    // Check specific email type preferences
    const typePreferenceMap = {
      'job_alert': 'jobMatches',
      'application_confirmation': 'applicationUpdates',
      'notification_immediate': 'applicationUpdates',
      'interview_reminder': 'applicationUpdates',
      'daily_digest': 'weeklyDigest',
      'weekly_digest': 'weeklyDigest'
    };

    const prefKey = typePreferenceMap[emailType];
    if (prefKey && emailPrefs[prefKey] === false) {
      return true;
    }

    // Check quiet hours
    if (preferences.quietHours.enabled) {
      const now = new Date();
      const currentHour = now.getHours();
      const startHour = parseInt(preferences.quietHours.startTime.split(':')[0]);
      const endHour = parseInt(preferences.quietHours.endTime.split(':')[0]);

      if (startHour > endHour) {
        // Quiet hours span midnight (e.g., 22:00 to 08:00)
        if (currentHour >= startHour || currentHour <= endHour) {
          return true;
        }
      } else {
        // Quiet hours within same day
        if (currentHour >= startHour && currentHour <= endHour) {
          return true;
        }
      }
    }

    return false;
  }

  // Generate daily digest emails
  async generateDailyDigests() {
    console.log('📊 Generating daily digest emails...');
    
    try {
      // Get users who want daily digests
      const users = await User.find({})
        .populate('notificationPreferences')
        .where('notificationPreferences.preferences.email.frequency')
        .equals('daily');

      for (const user of users) {
        await this.createDailyDigestEmail(user);
      }

      console.log(`✅ Generated daily digests for ${users.length} users`);
    } catch (error) {
      console.error('Error generating daily digests:', error);
    }
  }

  // Generate weekly digest emails
  async generateWeeklyDigests() {
    console.log('📊 Generating weekly digest emails...');
    
    try {
      // Get users who want weekly digests
      const users = await User.find({})
        .populate('notificationPreferences')
        .where('notificationPreferences.preferences.email.weeklyDigest')
        .equals(true);

      for (const user of users) {
        await this.createWeeklyDigestEmail(user);
      }

      console.log(`✅ Generated weekly digests for ${users.length} users`);
    } catch (error) {
      console.error('Error generating weekly digests:', error);
    }
  }

  // Create daily digest email for a user
  async createDailyDigestEmail(user) {
    // This would collect daily activity data
    // For now, we'll create a placeholder
    const digestData = {
      user: user,
      date: new Date().toDateString(),
      newJobs: 5, // placeholder
      applications: 2, // placeholder
      connections: 1 // placeholder
    };

    await EmailQueue.create({
      recipient: user._id,
      emailType: 'daily_digest',
      subject: 'Your Daily JobPortal Digest',
      htmlContent: await emailService.compileTemplate('daily-digest', digestData),
      templateData: digestData,
      priority: 'low',
      scheduledFor: new Date()
    });
  }

  // Create weekly digest email for a user
  async createWeeklyDigestEmail(user) {
    // This would collect weekly activity data
    const digestData = {
      user: user,
      weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toDateString(),
      weekEnd: new Date().toDateString(),
      newJobs: 25, // placeholder
      applications: 8, // placeholder
      connections: 3, // placeholder
      profileViews: 12 // placeholder
    };

    await EmailQueue.create({
      recipient: user._id,
      emailType: 'weekly_digest',
      subject: 'Your Weekly JobPortal Summary',
      htmlContent: await emailService.compileTemplate('weekly-digest', digestData),
      templateData: digestData,
      priority: 'low',
      scheduledFor: new Date()
    });
  }

  // Clean up old emails from the queue
  async cleanupOldEmails() {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const result = await EmailQueue.deleteMany({
        $or: [
          { status: 'sent', sentAt: { $lt: oneWeekAgo } },
          { status: 'failed', lastAttempt: { $lt: oneWeekAgo } },
          { status: 'cancelled', createdAt: { $lt: oneWeekAgo } }
        ]
      });

      console.log(`🧹 Cleaned up ${result.deletedCount} old emails from queue`);
    } catch (error) {
      console.error('Error cleaning up old emails:', error);
    }
  }

  // Queue a welcome email
  static async queueWelcomeEmail(user) {
    const templateData = {
      name: user.name,
      dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
      profileCompleteness: user.profileCompleteness || 20,
      supportUrl: `${process.env.FRONTEND_URL}/support`
    };

    await EmailQueue.create({
      recipient: user._id,
      emailType: 'welcome',
      subject: 'Welcome to JobPortal!',
      htmlContent: await emailService.compileTemplate('welcome', templateData),
      templateData,
      priority: 'high',
      scheduledFor: new Date()
    });
  }

  // Queue a password reset email
  static async queuePasswordResetEmail(user, resetToken) {
    const templateData = {
      name: user.name,
      resetUrl: `${process.env.FRONTEND_URL}/reset-password/${resetToken}`,
      expirationTime: 60, // 60 minutes
      requestTime: new Date().toLocaleString(),
      ipAddress: 'IP_ADDRESS', // This should be passed from the request
      userAgent: 'USER_AGENT', // This should be passed from the request
      supportUrl: `${process.env.FRONTEND_URL}/support`
    };

    await EmailQueue.create({
      recipient: user._id,
      emailType: 'password_reset',
      subject: 'Password Reset Request - JobPortal',
      htmlContent: await emailService.compileTemplate('password-reset', templateData),
      templateData,
      priority: 'high',
      scheduledFor: new Date()
    });
  }

  // Queue job alert emails
  static async queueJobAlertEmail(user, jobs) {
    const templateData = {
      name: user.name,
      jobCount: jobs.length,
      jobs: jobs.slice(0, 5), // Show top 5 jobs
      hasMoreJobs: jobs.length > 5,
      totalJobs: jobs.length,
      profileCompleteness: user.profileCompleteness,
      allJobsUrl: `${process.env.FRONTEND_URL}/jobs`,
      profileUrl: `${process.env.FRONTEND_URL}/profile`,
      unsubscribeUrl: `${process.env.FRONTEND_URL}/notifications/preferences`
    };

    await EmailQueue.create({
      recipient: user._id,
      emailType: 'job_alert',
      subject: `🎯 ${jobs.length} New Job Matches Found!`,
      htmlContent: await emailService.compileTemplate('job-alert', templateData),
      templateData,
      priority: 'medium',
      scheduledFor: new Date()
    });
  }

  // Utility method for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get queue statistics
  async getQueueStats() {
    const stats = await EmailQueue.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      cancelled: 0
    };

    stats.forEach(stat => {
      result[stat._id] = stat.count;
    });

    return result;
  }
}

export default new EmailQueueProcessor();