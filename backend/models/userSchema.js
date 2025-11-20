import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Experience sub-schema
const experienceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  isCurrent: { type: Boolean, default: false },
  description: { type: String, maxLength: 1000 },
  skills: [{ type: String }]
});

// Education sub-schema
const educationSchema = new mongoose.Schema({
  institution: { type: String, required: true },
  degree: { type: String, required: true },
  fieldOfStudy: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  grade: { type: String },
  description: { type: String, maxLength: 500 }
});

// Skills sub-schema with endorsements
const skillSchema = new mongoose.Schema({
  name: { type: String, required: true },
  level: { type: String, enum: ["Beginner", "Intermediate", "Advanced", "Expert"], default: "Intermediate" },
  endorsements: [{
    user: { type: mongoose.Schema.ObjectId, ref: "User" },
    endorsedAt: { type: Date, default: Date.now }
  }],
  yearsOfExperience: { type: Number, default: 0 },
  verified: { type: Boolean, default: false }
});

// Certification sub-schema
const certificationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  issuer: { type: String, required: true },
  issueDate: { type: Date },
  expiryDate: { type: Date },
  credentialId: { type: String },
  credentialUrl: { type: String },
  verified: { type: Boolean, default: false }
});

// Social links sub-schema
const socialLinksSchema = new mongoose.Schema({
  linkedin: { type: String, validate: [validator.isURL, "Please provide a valid URL"] },
  github: { type: String, validate: [validator.isURL, "Please provide a valid URL"] },
  portfolio: { type: String, validate: [validator.isURL, "Please provide a valid URL"] },
  twitter: { type: String, validate: [validator.isURL, "Please provide a valid URL"] },
  behance: { type: String, validate: [validator.isURL, "Please provide a valid URL"] },
  dribbble: { type: String, validate: [validator.isURL, "Please provide a valid URL"] }
});

// Preferences sub-schema
const preferencesSchema = new mongoose.Schema({
  jobTypes: [{ type: String, enum: ["Full-time", "Part-time", "Contract", "Freelance", "Internship"] }],
  workArrangement: [{ type: String, enum: ["Remote", "On-site", "Hybrid"] }],
  salaryExpectation: {
    min: { type: Number },
    max: { type: Number },
    currency: { type: String, default: "USD" }
  },
  preferredLocations: [{ type: String }],
  industries: [{ type: String }],
  openToRelocate: { type: Boolean, default: false },
  availabilityDate: { type: Date }
});

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, "Please enter your Name!"],
    minLength: [3, "Name must contain at least 3 Characters!"],
    maxLength: [30, "Name cannot exceed 30 Characters!"],
  },
  email: {
    type: String,
    required: [true, "Please enter your Email!"],
    validate: [validator.isEmail, "Please provide a valid Email!"],
  },
  phone: {
    type: Number,
    required: [true, "Please enter your Phone Number!"],
  },
  password: {
    type: String,
    required: [true, "Please provide a Password!"],
    minLength: [8, "Password must contain at least 8 characters!"],
    maxLength: [32, "Password cannot exceed 32 characters!"],
    select: false,
  },
  role: {
    type: String,
    required: [true, "Please select a role"],
    enum: ["Job Seeker", "Employer", "Recruiter", "Admin"],
  },
  
  // Professional Profile Information
  profilePhoto: {
    public_id: { type: String },
    url: { type: String }
  },
  headline: {
    type: String,
    maxLength: [120, "Headline cannot exceed 120 characters"]
  },
  summary: {
    type: String,
    maxLength: [2000, "Summary cannot exceed 2000 characters"]
  },
  location: {
    city: { type: String },
    state: { type: String },
    country: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },
  
  // Professional Details
  experience: [experienceSchema],
  education: [educationSchema],
  skills: [skillSchema],
  certifications: [certificationSchema],
  
  // Social & External Links
  socialLinks: socialLinksSchema,
  resume: {
    public_id: { type: String },
    url: { type: String }
  },
  
  // Job Preferences (for Job Seekers)
  preferences: preferencesSchema,
  
  // Networking Features
  connections: [{
    user: { type: mongoose.Schema.ObjectId, ref: "User" },
    status: { type: String, enum: ["pending", "accepted", "blocked"], default: "pending" },
    connectedAt: { type: Date, default: Date.now },
    note: { type: String, maxLength: 300 }
  }],
  
  // Company Information (for Employers)
  company: {
    name: { type: String },
    website: { type: String, validate: [validator.isURL, "Please provide a valid URL"] },
    industry: { type: String },
    size: { type: String, enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"] },
    description: { type: String, maxLength: 2000 },
    logo: {
      public_id: { type: String },
      url: { type: String }
    },
    founded: { type: Number },
    headquarters: { type: String }
  },
  
  // Profile Metrics
  profileViews: { type: Number, default: 0 },
  profileCompleteness: { type: Number, default: 0 },
  searchAppearances: { type: Number, default: 0 },
  
  // Privacy Settings
  privacy: {
    showEmail: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: false },
    profileVisibility: { type: String, enum: ["public", "connections", "private"], default: "public" },
    showActivity: { type: Boolean, default: true }
  },
  
  // Account Status
  isVerified: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});


//ENCRYPTING THE PASSWORD WHEN THE USER REGISTERS OR MODIFIES HIS PASSWORD
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

//COMPARING THE USER PASSWORD ENTERED BY USER WITH THE USER SAVED PASSWORD
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

//GENERATING A JWT TOKEN WHEN A USER REGISTERS OR LOGINS, IT DEPENDS ON OUR CODE THAT WHEN DO WE NEED TO GENERATE THE JWT TOKEN WHEN THE USER LOGIN OR REGISTER OR FOR BOTH. 
userSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

//CALCULATE PROFILE COMPLETENESS PERCENTAGE
userSchema.methods.calculateProfileCompleteness = function () {
  let completeness = 0;
  const maxScore = 100;
  
  // Basic information (30%)
  if (this.name) completeness += 5;
  if (this.email) completeness += 5;
  if (this.phone) completeness += 5;
  if (this.headline) completeness += 5;
  if (this.summary) completeness += 5;
  if (this.profilePhoto && this.profilePhoto.url) completeness += 5;
  
  // Professional details (40%)
  if (this.experience && this.experience.length > 0) completeness += 15;
  if (this.education && this.education.length > 0) completeness += 10;
  if (this.skills && this.skills.length >= 3) completeness += 10;
  if (this.location && this.location.city) completeness += 5;
  
  // Additional details (30%)
  if (this.certifications && this.certifications.length > 0) completeness += 5;
  if (this.socialLinks && Object.keys(this.socialLinks).length > 0) completeness += 5;
  if (this.resume && this.resume.url) completeness += 10;
  if (this.preferences && this.preferences.jobTypes && this.preferences.jobTypes.length > 0) completeness += 5;
  if (this.company && this.company.name && this.role === 'Employer') completeness += 5;
  
  return Math.min(completeness, maxScore);
};

//UPDATE PROFILE COMPLETENESS BEFORE SAVING
userSchema.pre('save', function(next) {
  if (!this.isModified('password')) {
    this.profileCompleteness = this.calculateProfileCompleteness();
  }
  next();
});

export const User = mongoose.model("User", userSchema);
