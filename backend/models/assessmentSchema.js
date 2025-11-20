import mongoose from "mongoose";

// Question Schema for skill assessments
const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["multiple_choice", "coding", "text", "true_false", "matching"],
    required: true
  },
  question: {
    type: String,
    required: true,
    maxLength: 1000
  },
  options: [{
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false }
  }], // For multiple choice questions
  codingData: {
    language: { type: String }, // Programming language
    starterCode: { type: String },
    testCases: [{
      input: { type: String, required: true },
      expectedOutput: { type: String, required: true },
      isHidden: { type: Boolean, default: false }
    }],
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"] },
    timeLimit: { type: Number, default: 3600 } // in seconds
  }, // For coding questions
  correctAnswer: { type: String }, // For text/true_false questions
  points: { type: Number, default: 1 },
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    default: "Medium"
  },
  tags: [String], // For categorization
  explanation: { type: String, maxLength: 500 }
});

// Skill Assessment Schema
const skillAssessmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxLength: 200
  },
  description: {
    type: String,
    maxLength: 1000
  },
  skill: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  level: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced", "Expert"],
    required: true
  },
  questions: [questionSchema],
  settings: {
    timeLimit: { type: Number, default: 3600 }, // Total time limit in seconds
    passingScore: { type: Number, default: 70 }, // Percentage
    maxAttempts: { type: Number, default: 3 },
    showResultsImmediately: { type: Boolean, default: false },
    randomizeQuestions: { type: Boolean, default: true },
    allowReview: { type: Boolean, default: true }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  tags: [String],
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    default: "Medium"
  },
  estimatedDuration: { type: Number }, // in minutes
  totalQuestions: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate total questions and points before saving
skillAssessmentSchema.pre('save', function(next) {
  this.totalQuestions = this.questions.length;
  this.totalPoints = this.questions.reduce((total, question) => total + question.points, 0);
  this.updatedAt = new Date();
  next();
});

// Assessment Result Schema
const assessmentResultSchema = new mongoose.Schema({
  assessment: {
    type: mongoose.Schema.ObjectId,
    ref: "SkillAssessment",
    required: true
  },
  candidate: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  attemptNumber: {
    type: Number,
    required: true,
    default: 1
  },
  answers: [{
    questionIndex: { type: Number, required: true },
    answer: mongoose.Schema.Types.Mixed, // Can be string, array, or object
    isCorrect: { type: Boolean },
    pointsEarned: { type: Number, default: 0 },
    timeSpent: { type: Number }, // in seconds
    submittedAt: { type: Date, default: Date.now }
  }],
  results: {
    totalScore: { type: Number, required: true },
    percentage: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    correctAnswers: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    timeSpent: { type: Number }, // Total time in seconds
    skillLevel: { type: String, enum: ["Beginner", "Intermediate", "Advanced", "Expert"] }
  },
  feedback: {
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    detailedAnalysis: { type: String, maxLength: 2000 }
  },
  status: {
    type: String,
    enum: ["in_progress", "completed", "abandoned", "timed_out"],
    default: "in_progress"
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  isVerified: {
    type: Boolean,
    default: false
  }, // For proctored exams
  proctorData: {
    violations: [{
      type: { type: String },
      timestamp: { type: Date },
      severity: { type: String, enum: ["low", "medium", "high"] }
    }],
    flagged: { type: Boolean, default: false }
  }
});

// Interview Assessment Schema (for video interviews)
const interviewAssessmentSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.ObjectId,
    ref: "Job",
    required: true
  },
  candidate: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  interviewer: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: ["phone", "video", "in_person", "technical", "behavioral"],
    required: true
  },
  scheduledAt: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 60
  },
  status: {
    type: String,
    enum: ["scheduled", "in_progress", "completed", "cancelled", "rescheduled"],
    default: "scheduled"
  },
  meetingLink: { type: String },
  meetingId: { type: String },
  questions: [{
    question: { type: String, required: true },
    category: { type: String },
    expectedAnswer: { type: String },
    notes: { type: String },
    rating: { type: Number, min: 1, max: 5 }
  }],
  evaluation: {
    technicalSkills: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
    problemSolving: { type: Number, min: 1, max: 5 },
    culturalFit: { type: Number, min: 1, max: 5 },
    overall: { type: Number, min: 1, max: 5 },
    feedback: { type: String, maxLength: 2000 },
    recommendation: {
      type: String,
      enum: ["strong_hire", "hire", "no_hire", "strong_no_hire"]
    }
  },
  recordingData: {
    recordingUrl: { type: String },
    recordingId: { type: String },
    duration: { type: Number }, // in seconds
    aiAnalysis: {
      sentimentScore: { type: Number },
      confidenceLevel: { type: Number },
      keyTopics: [String],
      speakingTime: {
        candidate: { type: Number },
        interviewer: { type: Number }
      }
    }
  },
  notes: { type: String, maxLength: 2000 },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
});

// Company Assessment Schema (for employers to test candidates)
const companyAssessmentSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  title: {
    type: String,
    required: true,
    maxLength: 200
  },
  description: {
    type: String,
    maxLength: 1000
  },
  assessmentType: {
    type: String,
    enum: ["skills", "personality", "cognitive", "situational"],
    required: true
  },
  linkedJobs: [{
    type: mongoose.Schema.ObjectId,
    ref: "Job"
  }],
  questions: [{
    type: { type: String, required: true },
    content: { type: String, required: true },
    options: [String],
    correctAnswer: mongoose.Schema.Types.Mixed,
    weight: { type: Number, default: 1 }
  }],
  settings: {
    timeLimit: { type: Number },
    passingScore: { type: Number },
    isRequired: { type: Boolean, default: false },
    allowRetakes: { type: Boolean, default: false },
    showScoreToCandidate: { type: Boolean, default: true }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Skill Verification Schema
const skillVerificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  skill: {
    type: String,
    required: true
  },
  verificationMethod: {
    type: String,
    enum: ["assessment", "certification", "portfolio", "reference", "interview"],
    required: true
  },
  verificationData: {
    assessmentResult: { type: mongoose.Schema.ObjectId, ref: "AssessmentResult" },
    certificationUrl: { type: String },
    portfolioUrl: { type: String },
    referenceContact: { type: String },
    score: { type: Number },
    level: { type: String, enum: ["Beginner", "Intermediate", "Advanced", "Expert"] }
  },
  verifiedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User"
  },
  status: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending"
  },
  expiresAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  verifiedAt: {
    type: Date
  }
});

export const SkillAssessment = mongoose.model("SkillAssessment", skillAssessmentSchema);
export const AssessmentResult = mongoose.model("AssessmentResult", assessmentResultSchema);
export const InterviewAssessment = mongoose.model("InterviewAssessment", interviewAssessmentSchema);
export const CompanyAssessment = mongoose.model("CompanyAssessment", companyAssessmentSchema);
export const SkillVerification = mongoose.model("SkillVerification", skillVerificationSchema);