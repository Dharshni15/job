# 📧 Email Service Integration Guide

## Overview
This guide explains how to integrate email services (SendGrid or AWS SES) into your job portal application for notifications, alerts, and transactional emails.

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install @sendgrid/mail aws-sdk nodemailer handlebars mjml node-cron
```

### 2. Environment Configuration
Copy `.env.email.example` to `.env` and configure your email provider:

```env
# Choose your email provider
EMAIL_PROVIDER=sendgrid  # or 'aws-ses'

# SendGrid Setup
SENDGRID_API_KEY=your_sendgrid_api_key_here

# OR AWS SES Setup
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# Required settings
FROM_EMAIL=noreply@yourjobportal.com
FRONTEND_URL=http://localhost:3000
```

### 3. Initialize Email Service
Add to your main server file (`server.js` or `app.js`):

```javascript
import emailQueueProcessor from './services/emailQueueProcessor.js';

// Start email queue processor
emailQueueProcessor.start();
```

## 🔧 SendGrid Setup

### 1. Create SendGrid Account
- Sign up at [SendGrid](https://sendgrid.com)
- Verify your domain or sender identity
- Generate API key with full access

### 2. Configure SendGrid
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_api_key_here
FROM_EMAIL=noreply@yourdomain.com
```

### 3. Optional: Dynamic Templates
Create templates in SendGrid dashboard and use template IDs:
```env
SENDGRID_WELCOME_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_PASSWORD_RESET_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## ☁️ AWS SES Setup

### 1. Configure AWS SES
- Sign in to AWS Console
- Go to Simple Email Service (SES)
- Verify your domain and email addresses
- Request production access (remove sandbox limitations)

### 2. Create IAM User
Create an IAM user with `AmazonSESFullAccess` policy and get credentials:

```env
EMAIL_PROVIDER=aws-ses
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
FROM_EMAIL=noreply@yourdomain.com
```

### 3. Verify Email Addresses
```javascript
import emailService from './services/emailService.js';
await emailService.verifyEmailAddress('noreply@yourdomain.com');
```

## 📨 Usage Examples

### Send Welcome Email
```javascript
import emailQueueProcessor from './services/emailQueueProcessor.js';

// After user registration
await emailQueueProcessor.queueWelcomeEmail(user);
```

### Send Job Alert
```javascript
const matchingJobs = await getJobRecommendations(user);
await emailQueueProcessor.queueJobAlertEmail(user, matchingJobs);
```

### Send Custom Email
```javascript
import emailService from './services/emailService.js';

await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Custom Subject',
  template: 'welcome',
  templateData: {
    name: 'John Doe',
    dashboardUrl: 'https://yoursite.com/dashboard'
  }
});
```

## 🎨 Email Templates

### Template Structure
Templates are stored in `backend/templates/email/` with `.hbs` extension (Handlebars format).

### Available Templates
- `welcome.hbs` - Welcome email for new users
- `password-reset.hbs` - Password reset email
- `job-alert.hbs` - Job recommendations email
- `connection-request.hbs` - Professional connection notifications
- `skill-endorsement.hbs` - Skill endorsement notifications
- `weekly-digest.hbs` - Weekly activity summary

### Template Variables
Use `{{variableName}}` syntax in templates:
```html
<h1>Welcome {{name}}!</h1>
<p>Your profile is {{profileCompleteness}}% complete.</p>
<a href="{{dashboardUrl}}">Complete Your Profile</a>
```

## 🔄 Email Queue System

### Features
- **Retry Logic**: Failed emails automatically retry 3 times
- **Priority Handling**: High, medium, low priority emails
- **Scheduled Sending**: Schedule emails for future delivery
- **Batch Processing**: Process multiple emails efficiently
- **User Preferences**: Respect user notification preferences

### Queue Management API
```javascript
// Get queue statistics
GET /api/emails/queue/stats

// View queued emails
GET /api/emails/queue/jobs

// Retry failed email
POST /api/emails/queue/retry/:emailId

// Cancel pending email
DELETE /api/emails/queue/cancel/:emailId
```

## 📊 Email Analytics

### Track Email Performance
```javascript
// Get email analytics
GET /api/emails/analytics?startDate=2024-01-01&endDate=2024-01-31

// Response includes:
{
  "analytics": [
    {
      "emailType": "job_alert",
      "total": 1000,
      "sent": 950,
      "failed": 30,
      "successRate": "95.00"
    }
  ],
  "summary": {
    "totalEmails": 5000,
    "totalSent": 4750,
    "overallSuccessRate": "95.00"
  }
}
```

### Webhook Integration
Set up webhooks for email events (SendGrid):
```javascript
// Handle email delivery events
POST /api/emails/webhook

// Events: delivered, bounce, open, click, unsubscribe
```

## 🛠️ Advanced Configuration

### Custom SMTP (Alternative)
```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: 'smtp.yourprovider.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@domain.com',
    pass: 'your-password'
  }
});
```

### Rate Limiting
```env
EMAIL_RATE_LIMIT_PER_MINUTE=100
EMAIL_BATCH_SIZE=10
```

### Quiet Hours
Users can set quiet hours in notification preferences:
```javascript
{
  "quietHours": {
    "enabled": true,
    "startTime": "22:00",
    "endTime": "08:00",
    "timezone": "America/New_York"
  }
}
```

## 🧪 Testing

### Test Email Configuration
```javascript
// Test endpoint (Admin only)
POST /api/emails/test
```

### Development Mode
```env
EMAIL_PROVIDER=sendgrid
TEST_EMAIL=developer@yourcompany.com
```

### Preview Templates
```javascript
// Preview email template
POST /api/emails/preview
{
  "template": "welcome",
  "templateData": {
    "name": "Test User",
    "dashboardUrl": "https://example.com/dashboard"
  }
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check API keys/credentials
   - Verify email addresses in SES
   - Check queue processor is running

2. **Templates not found**
   - Ensure `.hbs` files exist in `backend/templates/email/`
   - Check file permissions

3. **High bounce rate**
   - Verify domain authentication
   - Check email content for spam triggers
   - Implement double opt-in for subscriptions

4. **Rate limiting**
   - Adjust batch size and processing frequency
   - Upgrade SendGrid/SES plan if needed

### Debug Mode
```env
NODE_ENV=development
DEBUG_EMAILS=true
```

## 📈 Production Checklist

- [ ] Domain authentication configured
- [ ] SPF/DKIM records set up
- [ ] Email addresses verified
- [ ] Production access granted (SES)
- [ ] Webhook endpoints configured
- [ ] Monitoring and alerts set up
- [ ] Backup email provider configured
- [ ] Rate limits configured appropriately
- [ ] Email templates tested
- [ ] Unsubscribe links implemented

## 🔐 Security Best Practices

1. **Environment Variables**: Never commit API keys to version control
2. **Access Control**: Restrict email admin endpoints
3. **Webhook Validation**: Verify webhook signatures
4. **Rate Limiting**: Implement proper rate limits
5. **Data Encryption**: Encrypt sensitive email content
6. **Audit Logging**: Log all email activities

## 📞 Support

For issues with:
- **SendGrid**: [SendGrid Support](https://support.sendgrid.com)
- **AWS SES**: [AWS Support](https://aws.amazon.com/support/)
- **This Integration**: Create an issue in the repository

---

🎉 Your email service is now ready! Users will receive professional notifications, job alerts, and important updates seamlessly.