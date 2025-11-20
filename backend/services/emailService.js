import sgMail from '@sendgrid/mail';
import AWS from 'aws-sdk';
import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'development'; // 'development', 'sendgrid', or 'aws-ses'
    this.templatesDir = path.join(__dirname, '../templates/email');
    this.compiledTemplates = new Map();
    
    this.initializeProvider();
  }

  initializeProvider() {
    // Development mode: always log, never initialize cloud providers
    if (this.provider === 'development') {
      console.log('🧪 Email service set to development mode - emails will be logged only');
      return;
    }

    switch (this.provider) {
      case 'sendgrid':
        this.initializeSendGrid();
        break;
      case 'aws-ses':
        this.initializeAWSSES();
        break;
      default:
        console.error('Invalid email provider. Use "development", "sendgrid" or "aws-ses"');
    }
  }

  initializeSendGrid() {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY is required for SendGrid integration');
      return;
    }
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('✅ SendGrid email service initialized');
  }

  initializeAWSSES() {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('AWS credentials are required for AWS SES integration');
      return;
    }

    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.ses = new AWS.SES({ apiVersion: '2010-12-01' });
    
    // Create nodemailer transporter for AWS SES
    this.transporter = nodemailer.createTransporter({
      SES: { ses: this.ses, aws: AWS }
    });

    console.log('✅ AWS SES email service initialized');
  }

  // Compile Handlebars template
  async compileTemplate(templateName, data = {}) {
    try {
      // Check if template is already compiled
      if (this.compiledTemplates.has(templateName)) {
        const template = this.compiledTemplates.get(templateName);
        return template(data);
      }

      // Read and compile template
      const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
      const templateSource = await fs.readFile(templatePath, 'utf-8');
      const template = handlebars.compile(templateSource);
      
      // Cache compiled template
      this.compiledTemplates.set(templateName, template);
      
      return template(data);
    } catch (error) {
      console.error(`Error compiling template ${templateName}:`, error);
      throw error;
    }
  }

  // Send email via SendGrid
  async sendWithSendGrid({ to, from, subject, html, text, templateId, dynamicTemplateData }) {
    try {
      const msg = {
        to,
        from: from || process.env.FROM_EMAIL || 'noreply@jobportal.com',
        subject,
        html,
        text
      };

      // Use dynamic template if provided
      if (templateId) {
        msg.templateId = templateId;
        msg.dynamicTemplateData = dynamicTemplateData;
        delete msg.html;
        delete msg.text;
        delete msg.subject;
      }

      const result = await sgMail.send(msg);
      return {
        success: true,
        messageId: result[0].headers['x-message-id'],
        provider: 'sendgrid'
      };
    } catch (error) {
      console.error('SendGrid Error:', error.response?.body || error.message);
      throw error;
    }
  }

  // Send email via AWS SES
  async sendWithAWSSES({ to, from, subject, html, text }) {
    try {
      const params = {
        Source: from || process.env.FROM_EMAIL || 'noreply@jobportal.com',
        Destination: {
          ToAddresses: Array.isArray(to) ? to : [to]
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8'
          },
          Body: {}
        }
      };

      if (html) {
        params.Message.Body.Html = {
          Data: html,
          Charset: 'UTF-8'
        };
      }

      if (text) {
        params.Message.Body.Text = {
          Data: text,
          Charset: 'UTF-8'
        };
      }

      const result = await this.ses.sendEmail(params).promise();
      return {
        success: true,
        messageId: result.MessageId,
        provider: 'aws-ses'
      };
    } catch (error) {
      console.error('AWS SES Error:', error);
      throw error;
    }
  }

  // Development email simulation
  async sendWithDevelopmentMode(emailData) {
    console.log('📧 [DEV MODE] Email would be sent:');
    console.log(`   To: ${emailData.to}`);
    console.log(`   Subject: ${emailData.subject}`);
    console.log(`   Template Data:`, emailData.templateData || 'None');
    
    return {
      success: true,
      messageId: 'dev_' + Date.now(),
      provider: 'development'
    };
  }

  // Main send method
  async sendEmail({
    to,
    from,
    subject,
    template,
    templateData = {},
    html,
    text,
    priority = 'normal',
    sendAt,
    templateId, // For SendGrid dynamic templates
    attachments = []
  }) {
    try {
      // Validate required fields
      if (!to) throw new Error('Recipient email is required');
      if (!subject && !template && !templateId) throw new Error('Subject or template is required');

      // Compile template if provided
      let emailHtml = html;
      let emailText = text;
      
      if (template) {
        try {
          emailHtml = await this.compileTemplate(template, templateData);
          // Generate text version from HTML if not provided
          if (!emailText) {
            emailText = this.htmlToText(emailHtml);
          }
        } catch (templateError) {
          console.warn('Template compilation failed, using fallback:', templateError.message);
          emailHtml = `<h1>${subject}</h1><p>Email content would be here.</p>`;
          emailText = `${subject} - Email content would be here.`;
        }
      }

      const emailData = {
        to,
        from,
        subject,
        html: emailHtml,
        text: emailText,
        templateId,
        templateData,
        attachments
      };

      // Development mode - just log the email
      if (this.provider === 'development') {
        return await this.sendWithDevelopmentMode(emailData);
      }

      // Send based on provider
      let result;
      switch (this.provider) {
        case 'sendgrid':
          result = await this.sendWithSendGrid(emailData);
          break;
        case 'aws-ses':
          if (templateId) {
            throw new Error('Dynamic templates not supported with AWS SES. Use template parameter instead.');
          }
          result = await this.sendWithAWSSES(emailData);
          break;
        case 'development':
          result = await this.sendWithDevelopmentMode(emailData);
          break;
        default:
          throw new Error('Invalid email provider configured');
      }

      console.log(`📧 Email sent successfully via ${result.provider}:`, result.messageId);
      return result;

    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }

  // Send transactional email templates
  async sendTransactionalEmail(type, recipientEmail, data) {
    const templates = {
      welcome: {
        subject: 'Welcome to JobPortal!',
        template: 'welcome'
      },
      passwordReset: {
        subject: 'Password Reset Request',
        template: 'password-reset'
      },
      emailVerification: {
        subject: 'Verify Your Email Address',
        template: 'email-verification'
      },
      jobAlert: {
        subject: 'New Job Matches Found!',
        template: 'job-alert'
      },
      applicationReceived: {
        subject: 'Application Received',
        template: 'application-received'
      },
      applicationStatusUpdate: {
        subject: 'Application Status Update',
        template: 'application-status-update'
      },
      interviewScheduled: {
        subject: 'Interview Scheduled',
        template: 'interview-scheduled'
      },
      connectionRequest: {
        subject: 'New Connection Request',
        template: 'connection-request'
      },
      skillEndorsement: {
        subject: 'Skill Endorsed',
        template: 'skill-endorsement'
      },
      weeklyDigest: {
        subject: 'Your Weekly Job Portal Digest',
        template: 'weekly-digest'
      }
    };

    const templateConfig = templates[type];
    if (!templateConfig) {
      throw new Error(`Unknown email template type: ${type}`);
    }

    return await this.sendEmail({
      to: recipientEmail,
      subject: templateConfig.subject,
      template: templateConfig.template,
      templateData: data
    });
  }

  // Utility methods
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  // Test email configuration
  async testEmailConfiguration() {
    try {
      const testResult = await this.sendEmail({
        to: process.env.TEST_EMAIL || 'test@example.com',
        subject: 'Email Service Test',
        html: '<h1>Email service is working!</h1><p>This is a test email from your job portal.</p>',
        text: 'Email service is working! This is a test email from your job portal.'
      });

      console.log('✅ Email test successful:', testResult);
      return testResult;
    } catch (error) {
      console.error('❌ Email test failed:', error);
      // In development mode, don't throw error - just return a success message
      if (process.env.NODE_ENV === 'development') {
        return {
          success: true,
          messageId: 'dev_test_' + Date.now(),
          provider: 'development',
          message: 'Email test completed in development mode'
        };
      }
      throw error;
    }
  }
}

export default new EmailService();