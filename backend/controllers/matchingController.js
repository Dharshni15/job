import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { User } from "../models/userSchema.js";
import { Job } from "../models/jobSchema.js";
import ErrorHandler from "../middlewares/error.js";

// Get AI-powered job recommendations for a candidate
export const getJobRecommendations = catchAsyncError(async (req, res, next) => {
  const candidate = await User.findById(req.user.id).populate('skills experience education preferences');
  
  if (!candidate) {
    return next(new ErrorHandler("User not found!", 404));
  }

  if (candidate.role !== "Job Seeker") {
    return next(new ErrorHandler("Access denied. Only job seekers can get recommendations.", 403));
  }

  // Get all active jobs
  const jobs = await Job.find({ 
    status: "active", 
    expired: false,
    applicationDeadline: { $gte: new Date() } 
  }).populate('postedBy', 'name company');

  // Calculate compatibility scores
  const jobsWithScores = jobs.map(job => {
    const compatibilityScore = job.calculateCompatibilityScore(candidate);
    return {
      job: job.toObject(),
      compatibilityScore,
      matchReasons: getMatchReasons(job, candidate, compatibilityScore)
    };
  });

  // Sort by compatibility score and filter minimum threshold
  const recommendations = jobsWithScores
    .filter(item => item.compatibilityScore >= 30) // Minimum 30% compatibility
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, 20); // Top 20 recommendations

  res.status(200).json({
    success: true,
    message: `Found ${recommendations.length} job recommendations`,
    recommendations,
    profileCompleteness: candidate.profileCompleteness
  });
});

// Get candidate recommendations for a specific job
export const getCandidateRecommendations = catchAsyncError(async (req, res, next) => {
  const { jobId } = req.params;
  
  const job = await Job.findById(jobId);
  if (!job) {
    return next(new ErrorHandler("Job not found!", 404));
  }

  // Check if user owns this job
  if (job.postedBy.toString() !== req.user.id) {
    return next(new ErrorHandler("Access denied. You can only get recommendations for your jobs.", 403));
  }

  // Get all job seekers with complete profiles
  const candidates = await User.find({ 
    role: "Job Seeker",
    profileCompleteness: { $gte: 40 } // Minimum 40% profile completeness
  }).populate('skills experience education preferences location');

  // Calculate compatibility scores
  const candidatesWithScores = candidates.map(candidate => {
    const compatibilityScore = job.calculateCompatibilityScore(candidate);
    return {
      candidate: {
        _id: candidate._id,
        name: candidate.name,
        email: candidate.privacy?.showEmail ? candidate.email : undefined,
        headline: candidate.headline,
        location: candidate.location,
        profilePhoto: candidate.profilePhoto,
        skills: candidate.skills?.slice(0, 5), // Top 5 skills
        experience: candidate.experience?.length || 0,
        profileCompleteness: candidate.profileCompleteness
      },
      compatibilityScore,
      matchReasons: getMatchReasons(job, candidate, compatibilityScore)
    };
  });

  // Sort by compatibility score and filter minimum threshold
  const recommendations = candidatesWithScores
    .filter(item => item.compatibilityScore >= 50) // Minimum 50% compatibility for candidates
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, 50); // Top 50 candidates

  res.status(200).json({
    success: true,
    message: `Found ${recommendations.length} candidate recommendations`,
    recommendations,
    jobTitle: job.title
  });
});

// Get detailed compatibility analysis
export const getCompatibilityAnalysis = catchAsyncError(async (req, res, next) => {
  const { jobId, candidateId } = req.params;
  
  const job = await Job.findById(jobId).populate('postedBy', 'name company');
  const candidate = await User.findById(candidateId);

  if (!job || !candidate) {
    return next(new ErrorHandler("Job or candidate not found!", 404));
  }

  if (candidate.role !== "Job Seeker") {
    return next(new ErrorHandler("Invalid candidate!", 400));
  }

  const compatibilityScore = job.calculateCompatibilityScore(candidate);
  const detailedAnalysis = getDetailedAnalysis(job, candidate);

  res.status(200).json({
    success: true,
    analysis: {
      compatibilityScore,
      job: {
        _id: job._id,
        title: job.title,
        company: job.postedBy.company?.name || job.postedBy.name,
        location: `${job.city}, ${job.country}`,
        workArrangement: job.workArrangement,
        experienceLevel: job.experienceLevel
      },
      candidate: {
        _id: candidate._id,
        name: candidate.name,
        headline: candidate.headline,
        location: candidate.location,
        profileCompleteness: candidate.profileCompleteness
      },
      detailedAnalysis,
      recommendations: getImprovementRecommendations(job, candidate, compatibilityScore)
    }
  });
});

// Advanced search with AI filtering
export const advancedJobSearch = catchAsyncError(async (req, res, next) => {
  const {
    query,
    skills,
    location,
    salaryMin,
    salaryMax,
    workArrangement,
    jobType,
    experienceLevel,
    sortBy = 'relevance',
    page = 1,
    limit = 20
  } = req.query;

  const candidate = await User.findById(req.user.id);

  // Build search criteria
  let searchCriteria = {
    status: "active",
    expired: false
  };

  // Text search
  if (query) {
    searchCriteria.$or = [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { aiKeywords: { $in: query.toLowerCase().split(' ') } }
    ];
  }

  // Skills search
  if (skills) {
    const skillsArray = skills.split(',');
    searchCriteria['requiredSkills.name'] = { $in: skillsArray };
  }

  // Location search
  if (location) {
    searchCriteria.$or = [
      { city: { $regex: location, $options: 'i' } },
      { country: { $regex: location, $options: 'i' } },
      { workArrangement: 'Remote' }
    ];
  }

  // Salary range
  if (salaryMin || salaryMax) {
    searchCriteria.$or = [];
    if (salaryMin) {
      searchCriteria.$or.push(
        { fixedSalary: { $gte: parseInt(salaryMin) } },
        { salaryFrom: { $gte: parseInt(salaryMin) } }
      );
    }
    if (salaryMax) {
      searchCriteria.$or.push(
        { fixedSalary: { $lte: parseInt(salaryMax) } },
        { salaryTo: { $lte: parseInt(salaryMax) } }
      );
    }
  }

  // Other filters
  if (workArrangement) searchCriteria.workArrangement = workArrangement;
  if (jobType) searchCriteria.jobType = jobType;
  if (experienceLevel) searchCriteria.experienceLevel = experienceLevel;

  // Execute search
  const jobs = await Job.find(searchCriteria)
    .populate('postedBy', 'name company profilePhoto')
    .populate('company', 'name company profilePhoto');

  // If user is logged in and is a job seeker, add compatibility scores
  let jobsWithScores = jobs;
  if (candidate && candidate.role === "Job Seeker") {
    jobsWithScores = jobs.map(job => ({
      ...job.toObject(),
      compatibilityScore: job.calculateCompatibilityScore(candidate)
    }));
  }

  // Sort results
  if (sortBy === 'relevance' && candidate) {
    jobsWithScores.sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0));
  } else if (sortBy === 'date') {
    jobsWithScores.sort((a, b) => new Date(b.jobPostedOn) - new Date(a.jobPostedOn));
  } else if (sortBy === 'salary') {
    jobsWithScores.sort((a, b) => {
      const salaryA = a.fixedSalary || a.salaryTo || 0;
      const salaryB = b.fixedSalary || b.salaryTo || 0;
      return salaryB - salaryA;
    });
  }

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedJobs = jobsWithScores.slice(startIndex, endIndex);

  res.status(200).json({
    success: true,
    jobs: paginatedJobs,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(jobsWithScores.length / limit),
      totalJobs: jobsWithScores.length,
      hasNext: endIndex < jobsWithScores.length,
      hasPrev: startIndex > 0
    }
  });
});

// Helper function to get match reasons
function getMatchReasons(job, candidate, score) {
  const reasons = [];
  
  // Skills match
  if (job.requiredSkills && candidate.skills) {
    const matchedSkills = job.requiredSkills.filter(reqSkill =>
      candidate.skills.some(candSkill => 
        candSkill.name.toLowerCase() === reqSkill.name.toLowerCase()
      )
    );
    if (matchedSkills.length > 0) {
      reasons.push(`Matches ${matchedSkills.length} required skills: ${matchedSkills.map(s => s.name).join(', ')}`);
    }
  }

  // Experience match
  if (candidate.experience && candidate.experience.length > 0) {
    const totalExp = candidate.experience.reduce((total, exp) => {
      const years = (new Date() - new Date(exp.startDate)) / (1000 * 60 * 60 * 24 * 365);
      return total + years;
    }, 0);
    
    if (totalExp >= job.minExperience) {
      reasons.push(`${Math.floor(totalExp)} years experience (${job.minExperience}+ required)`);
    }
  }

  // Location match
  if (job.workArrangement === 'Remote') {
    reasons.push('Remote work available');
  } else if (candidate.location?.city === job.city) {
    reasons.push('Location match');
  }

  // High compatibility score
  if (score >= 80) {
    reasons.push('Excellent overall match');
  } else if (score >= 70) {
    reasons.push('Very good match');
  }

  return reasons;
}

// Helper function for detailed analysis
function getDetailedAnalysis(job, candidate) {
  const analysis = {
    skillsAnalysis: { matched: [], missing: [], score: 0 },
    experienceAnalysis: { score: 0, details: "" },
    locationAnalysis: { score: 0, details: "" },
    educationAnalysis: { score: 0, details: "" },
    overallFit: { score: 0, strengths: [], concerns: [] }
  };

  // Skills analysis
  if (job.requiredSkills && candidate.skills) {
    const matched = [];
    const missing = [];
    
    job.requiredSkills.forEach(reqSkill => {
      const candidateSkill = candidate.skills.find(s => 
        s.name.toLowerCase() === reqSkill.name.toLowerCase()
      );
      
      if (candidateSkill) {
        matched.push({
          skill: reqSkill.name,
          required: reqSkill.level,
          candidate: candidateSkill.level,
          importance: reqSkill.importance
        });
      } else {
        missing.push(reqSkill);
      }
    });
    
    analysis.skillsAnalysis = {
      matched,
      missing,
      score: Math.round((matched.length / job.requiredSkills.length) * 100)
    };
  }

  return analysis;
}

// Helper function for improvement recommendations
function getImprovementRecommendations(job, candidate, score) {
  const recommendations = [];

  if (score < 70) {
    recommendations.push({
      category: "Profile Completion",
      suggestion: "Complete your profile to improve match accuracy",
      impact: "High"
    });
  }

  if (job.requiredSkills && candidate.skills) {
    const missingSkills = job.requiredSkills.filter(reqSkill =>
      !candidate.skills.some(candSkill => 
        candSkill.name.toLowerCase() === reqSkill.name.toLowerCase()
      )
    );
    
    if (missingSkills.length > 0) {
      recommendations.push({
        category: "Skills Development",
        suggestion: `Consider developing these skills: ${missingSkills.map(s => s.name).join(', ')}`,
        impact: "High"
      });
    }
  }

  return recommendations;
}