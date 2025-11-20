import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { 
  SkillAssessment, 
  AssessmentResult, 
  InterviewAssessment, 
  CompanyAssessment, 
  SkillVerification 
} from "../models/assessmentSchema.js";
import { User } from "../models/userSchema.js";
import { Job } from "../models/jobSchema.js";
import { Activity } from "../models/networkingSchema.js";
import ErrorHandler from "../middlewares/error.js";

// ============ SKILL ASSESSMENTS ============

// Create a new skill assessment
export const createSkillAssessment = catchAsyncError(async (req, res, next) => {
  const {
    title,
    description,
    skill,
    category,
    level,
    questions,
    settings,
    tags,
    difficulty,
    estimatedDuration
  } = req.body;

  const assessment = await SkillAssessment.create({
    title,
    description,
    skill,
    category,
    level,
    questions,
    settings,
    tags,
    difficulty,
    estimatedDuration,
    createdBy: req.user.id
  });

  res.status(201).json({
    success: true,
    message: "Skill assessment created successfully!",
    assessment
  });
});

// Get all available assessments
export const getAllAssessments = catchAsyncError(async (req, res, next) => {
  const { skill, category, level, difficulty, page = 1, limit = 20 } = req.query;

  // Build filter criteria
  let filter = { isActive: true };
  if (skill) filter.skill = { $regex: skill, $options: 'i' };
  if (category) filter.category = category;
  if (level) filter.level = level;
  if (difficulty) filter.difficulty = difficulty;

  const assessments = await SkillAssessment.find(filter)
    .populate('createdBy', 'name company')
    .select('-questions') // Don't include questions in list view
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const totalAssessments = await SkillAssessment.countDocuments(filter);

  res.status(200).json({
    success: true,
    assessments,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalAssessments / limit),
      totalAssessments,
      hasNext: (page * limit) < totalAssessments,
      hasPrev: page > 1
    }
  });
});

// Get specific assessment details
export const getAssessmentDetails = catchAsyncError(async (req, res, next) => {
  const { assessmentId } = req.params;

  const assessment = await SkillAssessment.findById(assessmentId)
    .populate('createdBy', 'name company');

  if (!assessment) {
    return next(new ErrorHandler("Assessment not found!", 404));
  }

  // Don't include correct answers for candidates
  if (req.user.role === 'Job Seeker') {
    assessment.questions = assessment.questions.map(q => ({
      ...q.toObject(),
      options: q.options?.map(opt => ({
        text: opt.text,
        // Remove isCorrect flag
      })),
      correctAnswer: undefined,
      explanation: undefined
    }));
  }

  res.status(200).json({
    success: true,
    assessment
  });
});

// Start an assessment
export const startAssessment = catchAsyncError(async (req, res, next) => {
  const { assessmentId } = req.params;
  const candidateId = req.user.id;

  if (req.user.role !== 'Job Seeker') {
    return next(new ErrorHandler("Only job seekers can take assessments!", 403));
  }

  const assessment = await SkillAssessment.findById(assessmentId);
  if (!assessment || !assessment.isActive) {
    return next(new ErrorHandler("Assessment not found or inactive!", 404));
  }

  // Check if candidate has already taken this assessment
  const existingResults = await AssessmentResult.find({
    assessment: assessmentId,
    candidate: candidateId
  });

  if (existingResults.length >= assessment.settings.maxAttempts) {
    return next(new ErrorHandler("Maximum attempts exceeded for this assessment!", 400));
  }

  const attemptNumber = existingResults.length + 1;

  // Create new assessment result
  const result = await AssessmentResult.create({
    assessment: assessmentId,
    candidate: candidateId,
    attemptNumber,
    status: 'in_progress'
  });

  // Prepare questions without answers
  const questionsForCandidate = assessment.questions.map((q, index) => ({
    index,
    type: q.type,
    question: q.question,
    options: q.options?.map(opt => ({ text: opt.text })),
    codingData: q.codingData ? {
      language: q.codingData.language,
      starterCode: q.codingData.starterCode,
      timeLimit: q.codingData.timeLimit
    } : undefined,
    points: q.points,
    difficulty: q.difficulty
  }));

  res.status(200).json({
    success: true,
    message: "Assessment started successfully!",
    resultId: result._id,
    assessment: {
      title: assessment.title,
      description: assessment.description,
      timeLimit: assessment.settings.timeLimit,
      totalQuestions: assessment.totalQuestions,
      questions: questionsForCandidate
    }
  });
});

// Submit assessment answers
export const submitAssessment = catchAsyncError(async (req, res, next) => {
  const { resultId } = req.params;
  const { answers, timeSpent } = req.body;

  const result = await AssessmentResult.findById(resultId)
    .populate('assessment')
    .populate('candidate', 'name skills');

  if (!result) {
    return next(new ErrorHandler("Assessment result not found!", 404));
  }

  if (result.candidate._id.toString() !== req.user.id) {
    return next(new ErrorHandler("Unauthorized to submit this assessment!", 403));
  }

  if (result.status !== 'in_progress') {
    return next(new ErrorHandler("Assessment has already been submitted!", 400));
  }

  // Evaluate answers
  const assessment = result.assessment;
  let totalScore = 0;
  let correctAnswers = 0;
  const evaluatedAnswers = [];

  answers.forEach(answer => {
    const question = assessment.questions[answer.questionIndex];
    let isCorrect = false;
    let pointsEarned = 0;

    if (question.type === 'multiple_choice') {
      const correctOptions = question.options.filter(opt => opt.isCorrect);
      if (Array.isArray(answer.answer)) {
        // Multiple correct answers
        isCorrect = correctOptions.length === answer.answer.length &&
                   correctOptions.every(opt => answer.answer.includes(opt.text));
      } else {
        // Single correct answer
        isCorrect = correctOptions.length === 1 && 
                   correctOptions[0].text === answer.answer;
      }
    } else if (question.type === 'true_false') {
      isCorrect = question.correctAnswer === answer.answer;
    } else if (question.type === 'text') {
      // Simple text matching (can be enhanced with NLP)
      isCorrect = question.correctAnswer?.toLowerCase().trim() === 
                 answer.answer?.toLowerCase().trim();
    }

    if (isCorrect) {
      correctAnswers++;
      pointsEarned = question.points;
      totalScore += pointsEarned;
    }

    evaluatedAnswers.push({
      questionIndex: answer.questionIndex,
      answer: answer.answer,
      isCorrect,
      pointsEarned,
      timeSpent: answer.timeSpent || 0
    });
  });

  const percentage = Math.round((totalScore / assessment.totalPoints) * 100);
  const passed = percentage >= assessment.settings.passingScore;

  // Determine skill level based on performance
  let skillLevel = 'Beginner';
  if (percentage >= 90) skillLevel = 'Expert';
  else if (percentage >= 75) skillLevel = 'Advanced';
  else if (percentage >= 60) skillLevel = 'Intermediate';

  // Update result
  result.answers = evaluatedAnswers;
  result.results = {
    totalScore,
    percentage,
    totalQuestions: assessment.totalQuestions,
    correctAnswers,
    passed,
    timeSpent: timeSpent || 0,
    skillLevel
  };
  result.status = 'completed';
  result.completedAt = new Date();

  await result.save();

  // Generate feedback
  const feedback = generateAssessmentFeedback(result, assessment);
  result.feedback = feedback;
  await result.save();

  // Update user's skill if passed
  if (passed) {
    const candidate = result.candidate;
    const existingSkillIndex = candidate.skills.findIndex(
      s => s.name.toLowerCase() === assessment.skill.toLowerCase()
    );

    if (existingSkillIndex !== -1) {
      // Update existing skill level if better
      const currentLevel = candidate.skills[existingSkillIndex].level;
      const levelHierarchy = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3, 'Expert': 4 };
      
      if (levelHierarchy[skillLevel] > levelHierarchy[currentLevel]) {
        candidate.skills[existingSkillIndex].level = skillLevel;
        candidate.skills[existingSkillIndex].verified = true;
      }
    } else {
      // Add new skill
      candidate.skills.push({
        name: assessment.skill,
        level: skillLevel,
        verified: true
      });
    }
    
    await candidate.save();

    // Create activity
    await Activity.create({
      user: candidate._id,
      type: "achievement_unlocked",
      content: {
        title: `Completed ${assessment.skill} assessment`,
        description: `Achieved ${skillLevel} level with ${percentage}% score`
      }
    });
  }

  res.status(200).json({
    success: true,
    message: "Assessment submitted successfully!",
    result: {
      score: totalScore,
      percentage,
      passed,
      skillLevel,
      feedback: assessment.settings.showResultsImmediately ? feedback : undefined
    }
  });
});

// Get assessment results for a user
export const getAssessmentResults = catchAsyncError(async (req, res, next) => {
  const { userId } = req.params;
  const currentUserId = req.user.id;

  // Privacy check
  if (userId !== currentUserId && req.user.role !== 'Admin') {
    const user = await User.findById(userId);
    if (user.privacy?.profileVisibility === 'private') {
      return next(new ErrorHandler("User's assessment results are private!", 403));
    }
  }

  const results = await AssessmentResult.find({
    candidate: userId,
    status: 'completed'
  })
  .populate('assessment', 'title skill category level')
  .sort({ completedAt: -1 });

  res.status(200).json({
    success: true,
    results
  });
});

// ============ INTERVIEW ASSESSMENTS ============

// Schedule an interview
export const scheduleInterview = catchAsyncError(async (req, res, next) => {
  const {
    jobId,
    candidateId,
    type,
    scheduledAt,
    duration,
    questions
  } = req.body;

  const job = await Job.findById(jobId);
  if (!job) {
    return next(new ErrorHandler("Job not found!", 404));
  }

  if (job.postedBy.toString() !== req.user.id) {
    return next(new ErrorHandler("You can only schedule interviews for your jobs!", 403));
  }

  const candidate = await User.findById(candidateId);
  if (!candidate || candidate.role !== 'Job Seeker') {
    return next(new ErrorHandler("Invalid candidate!", 400));
  }

  const interview = await InterviewAssessment.create({
    job: jobId,
    candidate: candidateId,
    interviewer: req.user.id,
    type,
    scheduledAt: new Date(scheduledAt),
    duration,
    questions: questions || []
  });

  res.status(201).json({
    success: true,
    message: "Interview scheduled successfully!",
    interview
  });
});

// Update interview evaluation
export const updateInterviewEvaluation = catchAsyncError(async (req, res, next) => {
  const { interviewId } = req.params;
  const { evaluation, notes } = req.body;

  const interview = await InterviewAssessment.findById(interviewId);
  if (!interview) {
    return next(new ErrorHandler("Interview not found!", 404));
  }

  if (interview.interviewer.toString() !== req.user.id) {
    return next(new ErrorHandler("You can only evaluate your own interviews!", 403));
  }

  interview.evaluation = evaluation;
  interview.notes = notes;
  interview.status = 'completed';
  interview.completedAt = new Date();

  await interview.save();

  res.status(200).json({
    success: true,
    message: "Interview evaluation updated successfully!",
    interview
  });
});

// ============ COMPANY ASSESSMENTS ============

// Create company-specific assessment
export const createCompanyAssessment = catchAsyncError(async (req, res, next) => {
  const {
    title,
    description,
    assessmentType,
    questions,
    settings,
    linkedJobs
  } = req.body;

  if (req.user.role !== 'Employer' && req.user.role !== 'Recruiter') {
    return next(new ErrorHandler("Only employers can create company assessments!", 403));
  }

  const assessment = await CompanyAssessment.create({
    company: req.user.id,
    title,
    description,
    assessmentType,
    questions,
    settings,
    linkedJobs
  });

  res.status(201).json({
    success: true,
    message: "Company assessment created successfully!",
    assessment
  });
});

// ============ SKILL VERIFICATION ============

// Request skill verification
export const requestSkillVerification = catchAsyncError(async (req, res, next) => {
  const {
    skill,
    verificationMethod,
    verificationData
  } = req.body;

  const verification = await SkillVerification.create({
    user: req.user.id,
    skill,
    verificationMethod,
    verificationData
  });

  res.status(201).json({
    success: true,
    message: "Skill verification request submitted!",
    verification
  });
});

// Verify a skill (for admins/verifiers)
export const verifySkill = catchAsyncError(async (req, res, next) => {
  const { verificationId } = req.params;
  const { status, level } = req.body;

  if (req.user.role !== 'Admin' && req.user.role !== 'Recruiter') {
    return next(new ErrorHandler("You don't have permission to verify skills!", 403));
  }

  const verification = await SkillVerification.findById(verificationId);
  if (!verification) {
    return next(new ErrorHandler("Verification request not found!", 404));
  }

  verification.status = status;
  verification.verificationData.level = level;
  verification.verifiedBy = req.user.id;
  verification.verifiedAt = new Date();

  if (status === 'verified') {
    // Set expiry for certain verification types
    if (['certification', 'assessment'].includes(verification.verificationMethod)) {
      verification.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    }
  }

  await verification.save();

  // Update user's skill verification status
  if (status === 'verified') {
    const user = await User.findById(verification.user);
    const skillIndex = user.skills.findIndex(
      s => s.name.toLowerCase() === verification.skill.toLowerCase()
    );

    if (skillIndex !== -1) {
      user.skills[skillIndex].verified = true;
      user.skills[skillIndex].level = level;
      await user.save();
    }
  }

  res.status(200).json({
    success: true,
    message: `Skill verification ${status}!`,
    verification
  });
});

// Get popular skills and assessments
export const getSkillsStats = catchAsyncError(async (req, res, next) => {
  // Most popular skills from assessments
  const popularSkills = await SkillAssessment.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$skill", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);

  // Assessment completion stats
  const completionStats = await AssessmentResult.aggregate([
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: null,
        totalCompleted: { $sum: 1 },
        averageScore: { $avg: '$results.percentage' },
        passRate: { 
          $avg: { $cond: ['$results.passed', 1, 0] } 
        }
      }
    }
  ]);

  // Skills with highest demand (from job requirements)
  const demandedSkills = await Job.aggregate([
    { $match: { status: 'active', expired: false } },
    { $unwind: '$requiredSkills' },
    { 
      $group: { 
        _id: '$requiredSkills.name', 
        jobCount: { $sum: 1 },
        averageImportance: { 
          $avg: { 
            $cond: [
              { $eq: ['$requiredSkills.importance', 'Must-have'] }, 3,
              { $cond: [
                { $eq: ['$requiredSkills.importance', 'Preferred'] }, 2, 1
              ]}
            ]
          }
        }
      } 
    },
    { $sort: { jobCount: -1 } },
    { $limit: 20 }
  ]);

  res.status(200).json({
    success: true,
    stats: {
      popularSkills,
      completionStats: completionStats[0] || null,
      demandedSkills
    }
  });
});

// Helper function to generate assessment feedback
function generateAssessmentFeedback(result, assessment) {
  const { percentage, correctAnswers, totalQuestions } = result.results;
  const feedback = {
    strengths: [],
    weaknesses: [],
    recommendations: [],
    detailedAnalysis: ""
  };

  // Analyze performance by question difficulty
  const easyQuestions = result.answers.filter(ans => 
    assessment.questions[ans.questionIndex]?.difficulty === 'Easy'
  );
  const mediumQuestions = result.answers.filter(ans => 
    assessment.questions[ans.questionIndex]?.difficulty === 'Medium'
  );
  const hardQuestions = result.answers.filter(ans => 
    assessment.questions[ans.questionIndex]?.difficulty === 'Hard'
  );

  const easyScore = easyQuestions.length > 0 ? 
    (easyQuestions.filter(q => q.isCorrect).length / easyQuestions.length) * 100 : 0;
  const mediumScore = mediumQuestions.length > 0 ? 
    (mediumQuestions.filter(q => q.isCorrect).length / mediumQuestions.length) * 100 : 0;
  const hardScore = hardQuestions.length > 0 ? 
    (hardQuestions.filter(q => q.isCorrect).length / hardQuestions.length) * 100 : 0;

  // Strengths
  if (easyScore >= 80) feedback.strengths.push("Strong foundation in basic concepts");
  if (mediumScore >= 70) feedback.strengths.push("Good understanding of intermediate concepts");
  if (hardScore >= 60) feedback.strengths.push("Excellent grasp of advanced topics");
  if (percentage >= 90) feedback.strengths.push("Outstanding overall performance");

  // Weaknesses
  if (easyScore < 60) feedback.weaknesses.push("Need to strengthen fundamental concepts");
  if (mediumScore < 50) feedback.weaknesses.push("Intermediate concepts require more practice");
  if (hardScore < 40) feedback.weaknesses.push("Advanced topics need significant improvement");

  // Recommendations
  if (percentage < 70) {
    feedback.recommendations.push("Consider taking additional courses or tutorials");
    feedback.recommendations.push("Practice with more sample questions");
  }
  if (percentage >= 70 && percentage < 85) {
    feedback.recommendations.push("Focus on areas where you scored lowest");
    feedback.recommendations.push("Consider advanced training materials");
  }
  if (percentage >= 85) {
    feedback.recommendations.push("Excellent work! Consider mentoring others");
    feedback.recommendations.push("Look into advanced certifications in this skill");
  }

  feedback.detailedAnalysis = 
    `You scored ${correctAnswers} out of ${totalQuestions} questions correctly (${percentage}%). ` +
    `Your performance indicates ${result.results.skillLevel} level proficiency in ${assessment.skill}.`;

  return feedback;
}