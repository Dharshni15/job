import express from "express";
import dbConnection  from "./database/dbConnection.js";
import jobRouter from "./routes/jobRoutes.js";
import userRouter from "./routes/userRoutes.js";
import applicationRouter from "./routes/applicationRoutes.js";
import certificateRouter from "./routes/certificateRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import emailRouter from "./routes/emailRoutes.js";
import dotenv from "dotenv";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import fileRouter from "./routes/fileRoutes.js";

// Import email services
import emailService from "./services/emailService.js";

const app = express();
dotenv.config();

app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    method: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/job", jobRouter);
app.use("/api/v1/application", applicationRouter);
app.use("/api/v1/certificate", certificateRouter);
app.use("/api/v1/message", messageRouter);
app.use("/api/v1/email", emailRouter);
app.use("/api/v1/files", fileRouter);

// Health check endpoint
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Job Portal API is running",
    timestamp: new Date().toISOString(),
    services: {
      database: "connected",
      emailService: emailService.provider || "development",
    }
  });
});

dbConnection();

// Initialize email service
console.log("🚀 Initializing email service...");
if (process.env.NODE_ENV === 'development') {
  console.log("📧 Email service running in development mode");
}

app.use(errorMiddleware);
export default app;
