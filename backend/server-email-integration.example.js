// Example of how to integrate email services into your main server file

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fileUpload from 'express-fileupload';
import { dbConnection } from './database/dbConnection.js';
import { errorMiddleware } from './middlewares/error.js';

// Import email services
import emailService from './services/emailService.js';
import emailQueueProcessor from './services/emailQueueProcessor.js';

// Import routes
import userRouter from './routes/userRouter.js';
import jobRouter from './routes/jobRouter.js';
import applicationRouter from './routes/applicationRouter.js';
// Add new routes
import notificationRouter from './routes/notificationRouter.js';
import networkingRouter from './routes/networkingRouter.js';
import assessmentRouter from './routes/assessmentRouter.js';
import matchingRouter from './routes/matchingRouter.js';
import emailRouter from './routes/emailRouter.js';

const app = express();
dotenv.config({ path: './config/config.env' });

// CORS configuration
app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    credentials: true,
  })
);

// Middleware
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
  })
);

// Database connection
dbConnection();

// Initialize email services
console.log('🚀 Initializing email services...');

// Test email configuration on startup (optional)
if (process.env.NODE_ENV === 'development') {
  emailService.testEmailConfiguration()
    .then(() => console.log('✅ Email service test successful'))
    .catch(err => console.error('❌ Email service test failed:', err.message));
}

// Start email queue processor
emailQueueProcessor.start();

// Routes
app.use('/api/v1/user', userRouter);
app.use('/api/v1/job', jobRouter);
app.use('/api/v1/application', applicationRouter);

// New enhanced routes
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/networking', networkingRouter);
app.use('/api/v1/assessments', assessmentRouter);
app.use('/api/v1/matching', matchingRouter);
app.use('/api/v1/emails', emailRouter);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Job Portal API is running',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      emailService: emailService.provider || 'not configured',
      emailQueue: 'running'
    }
  });
});

// Error handling middleware
app.use(errorMiddleware);

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`🌟 Server running at port ${PORT}`);
  console.log(`📧 Email provider: ${emailService.provider}`);
  console.log(`🔄 Email queue processor: Active`);
});

// WebSocket setup for real-time notifications (optional)
import { Server } from 'socket.io';
import { handleSocketConnection } from './controllers/notificationController.js';

const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL],
    credentials: true
  }
});

// Make io globally available for notifications
global.io = io;

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);
  
  // Handle user authentication and store connection
  socket.on('authenticate', async (data) => {
    const { userId, token } = data;
    // Verify token and associate user with socket
    await handleSocketConnection(socket, userId);
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  
  // Stop email queue processor
  console.log('📧 Stopping email queue processor...');
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;