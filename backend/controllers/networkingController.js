import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { Connection, Endorsement, Recommendation, Activity, Follow, CompanyReview } from "../models/networkingSchema.js";
import { User } from "../models/userSchema.js";
import ErrorHandler from "../middlewares/error.js";

// ============ CONNECTION MANAGEMENT ============

// Send connection request
export const sendConnectionRequest = catchAsyncError(async (req, res, next) => {
  const { recipientId, message } = req.body;
  const requesterId = req.user.id;

  if (requesterId === recipientId) {
    return next(new ErrorHandler("You cannot connect with yourself!", 400));
  }

  const recipient = await User.findById(recipientId);
  if (!recipient) {
    return next(new ErrorHandler("User not found!", 404));
  }

  // Check if connection already exists
  const existingConnection = await Connection.findOne({
    $or: [
      { requester: requesterId, recipient: recipientId },
      { requester: recipientId, recipient: requesterId }
    ]
  });

  if (existingConnection) {
    return next(new ErrorHandler("Connection request already exists or you are already connected!", 400));
  }

  const connection = await Connection.create({
    requester: requesterId,
    recipient: recipientId,
    message
  });

  // Create activity for the connection request
  await Activity.create({
    user: requesterId,
    type: "connection_made",
    content: {
      title: `Sent connection request to ${recipient.name}`,
      description: message || "Let's connect!"
    },
    relatedEntities: { user: recipientId }
  });

  res.status(201).json({
    success: true,
    message: "Connection request sent successfully!",
    connection
  });
});

// Respond to connection request
export const respondToConnectionRequest = catchAsyncError(async (req, res, next) => {
  const { connectionId, response } = req.body; // response: 'accepted', 'declined', 'blocked'
  
  const connection = await Connection.findById(connectionId);
  if (!connection) {
    return next(new ErrorHandler("Connection request not found!", 404));
  }

  if (connection.recipient.toString() !== req.user.id) {
    return next(new ErrorHandler("Unauthorized to respond to this request!", 403));
  }

  if (connection.status !== 'pending') {
    return next(new ErrorHandler("Connection request has already been responded to!", 400));
  }

  connection.status = response;
  if (response === 'accepted') {
    connection.connectedAt = new Date();
  }
  
  await connection.save();

  if (response === 'accepted') {
    // Create activity for successful connection
    await Activity.create({
      user: req.user.id,
      type: "connection_made",
      content: {
        title: `Connected with ${connection.requester.name}`,
        description: "New professional connection made"
      },
      relatedEntities: { user: connection.requester }
    });
  }

  res.status(200).json({
    success: true,
    message: `Connection request ${response}!`,
    connection
  });
});

// Get user connections
export const getConnections = catchAsyncError(async (req, res, next) => {
  const { userId } = req.params;
  const currentUserId = req.user.id;
  
  // Check if user can view these connections
  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User not found!", 404));
  }

  // Privacy check
  if (userId !== currentUserId && user.privacy?.profileVisibility === 'private') {
    return next(new ErrorHandler("User's connections are private!", 403));
  }

  const connections = await Connection.find({
    $and: [
      {
        $or: [
          { requester: userId },
          { recipient: userId }
        ]
      },
      { status: 'accepted' }
    ]
  }).populate('requester', 'name headline profilePhoto location')
    .populate('recipient', 'name headline profilePhoto location');

  // Format connections to show the other person
  const formattedConnections = connections.map(conn => {
    const otherUser = conn.requester._id.toString() === userId ? conn.recipient : conn.requester;
    return {
      connection: conn,
      user: otherUser
    };
  });

  res.status(200).json({
    success: true,
    connections: formattedConnections,
    totalConnections: formattedConnections.length
  });
});

// ============ SKILL ENDORSEMENTS ============

// Endorse a user's skill
export const endorseSkill = catchAsyncError(async (req, res, next) => {
  const { userId, skillName, message } = req.body;
  const endorserId = req.user.id;

  if (endorserId === userId) {
    return next(new ErrorHandler("You cannot endorse yourself!", 400));
  }

  // Check if users are connected
  const connection = await Connection.findOne({
    $and: [
      {
        $or: [
          { requester: endorserId, recipient: userId },
          { requester: userId, recipient: endorserId }
        ]
      },
      { status: 'accepted' }
    ]
  });

  if (!connection) {
    return next(new ErrorHandler("You can only endorse connected users!", 403));
  }

  // Check if endorsement already exists
  const existingEndorsement = await Endorsement.findOne({
    endorser: endorserId,
    endorsee: userId,
    skillName: skillName
  });

  if (existingEndorsement) {
    return next(new ErrorHandler("You have already endorsed this skill!", 400));
  }

  const endorsement = await Endorsement.create({
    endorser: endorserId,
    endorsee: userId,
    skillName,
    message
  });

  // Update user's skill endorsement count
  const user = await User.findById(userId);
  const skillIndex = user.skills.findIndex(s => s.name.toLowerCase() === skillName.toLowerCase());
  if (skillIndex !== -1) {
    user.skills[skillIndex].endorsements.push({
      user: endorserId,
      endorsedAt: new Date()
    });
    await user.save();
  }

  // Create activity
  await Activity.create({
    user: endorserId,
    type: "skill_endorsed",
    content: {
      title: `Endorsed ${user.name} for ${skillName}`,
      description: message || `${skillName} skill endorsed`
    },
    relatedEntities: { user: userId }
  });

  res.status(201).json({
    success: true,
    message: "Skill endorsed successfully!",
    endorsement
  });
});

// Get skill endorsements for a user
export const getSkillEndorsements = catchAsyncError(async (req, res, next) => {
  const { userId } = req.params;
  
  const endorsements = await Endorsement.find({ 
    endorsee: userId, 
    isVisible: true 
  }).populate('endorser', 'name headline profilePhoto')
    .sort({ endorsedAt: -1 });

  // Group by skill
  const groupedEndorsements = endorsements.reduce((acc, endorsement) => {
    const skill = endorsement.skillName;
    if (!acc[skill]) {
      acc[skill] = [];
    }
    acc[skill].push(endorsement);
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    endorsements: groupedEndorsements
  });
});

// ============ RECOMMENDATIONS ============

// Request a recommendation
export const requestRecommendation = catchAsyncError(async (req, res, next) => {
  const { recommenderId, relationship, workContext, message } = req.body;
  const recommendeeId = req.user.id;

  if (recommenderId === recommendeeId) {
    return next(new ErrorHandler("You cannot request a recommendation from yourself!", 400));
  }

  // Check if users are connected
  const connection = await Connection.findOne({
    $and: [
      {
        $or: [
          { requester: recommenderId, recipient: recommendeeId },
          { requester: recommendeeId, recipient: recommenderId }
        ]
      },
      { status: 'accepted' }
    ]
  });

  if (!connection) {
    return next(new ErrorHandler("You can only request recommendations from connected users!", 403));
  }

  const recommendation = await Recommendation.create({
    recommender: recommenderId,
    recommendee: recommendeeId,
    relationship,
    workContext,
    recommendation: message,
    status: 'pending'
  });

  res.status(201).json({
    success: true,
    message: "Recommendation request sent successfully!",
    recommendation
  });
});

// Write a recommendation
export const writeRecommendation = catchAsyncError(async (req, res, next) => {
  const { recommendationId, recommendationText, skills } = req.body;
  
  const recommendation = await Recommendation.findById(recommendationId);
  if (!recommendation) {
    return next(new ErrorHandler("Recommendation request not found!", 404));
  }

  if (recommendation.recommender.toString() !== req.user.id) {
    return next(new ErrorHandler("Unauthorized to write this recommendation!", 403));
  }

  recommendation.recommendation = recommendationText;
  recommendation.skills = skills || [];
  recommendation.status = 'approved';
  recommendation.respondedAt = new Date();
  
  await recommendation.save();

  // Create activity
  const recommendee = await User.findById(recommendation.recommendee);
  await Activity.create({
    user: req.user.id,
    type: "recommendation_given",
    content: {
      title: `Wrote a recommendation for ${recommendee.name}`,
      description: "Professional recommendation provided"
    },
    relatedEntities: { user: recommendation.recommendee }
  });

  res.status(200).json({
    success: true,
    message: "Recommendation written successfully!",
    recommendation
  });
});

// Get recommendations for a user
export const getRecommendations = catchAsyncError(async (req, res, next) => {
  const { userId } = req.params;
  
  const recommendations = await Recommendation.find({ 
    recommendee: userId, 
    status: 'approved',
    isVisible: true 
  }).populate('recommender', 'name headline profilePhoto company')
    .sort({ respondedAt: -1 });

  res.status(200).json({
    success: true,
    recommendations
  });
});

// ============ PROFESSIONAL FEED ============

// Get professional activity feed
export const getActivityFeed = catchAsyncError(async (req, res, next) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;

  // Get user's connections
  const connections = await Connection.find({
    $and: [
      {
        $or: [
          { requester: userId },
          { recipient: userId }
        ]
      },
      { status: 'accepted' }
    ]
  });

  const connectedUserIds = connections.map(conn => 
    conn.requester.toString() === userId ? conn.recipient : conn.requester
  );

  // Include user's own activities and connected users' activities
  const userIds = [userId, ...connectedUserIds];

  const activities = await Activity.find({
    user: { $in: userIds },
    isActive: true,
    $or: [
      { visibility: 'public' },
      { 
        $and: [
          { visibility: 'connections' },
          { user: { $in: connectedUserIds } }
        ]
      },
      { user: userId } // Always show own activities
    ]
  })
  .populate('user', 'name headline profilePhoto')
  .populate('relatedEntities.user', 'name profilePhoto')
  .populate('relatedEntities.job', 'title')
  .populate('relatedEntities.company', 'name')
  .sort({ createdAt: -1 })
  .limit(limit * 1)
  .skip((page - 1) * limit);

  res.status(200).json({
    success: true,
    activities,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(activities.length / limit),
      hasNext: activities.length === limit
    }
  });
});

// Like an activity
export const likeActivity = catchAsyncError(async (req, res, next) => {
  const { activityId } = req.params;
  const userId = req.user.id;

  const activity = await Activity.findById(activityId);
  if (!activity) {
    return next(new ErrorHandler("Activity not found!", 404));
  }

  // Check if user already liked
  const existingLike = activity.likes.find(like => like.user.toString() === userId);
  
  if (existingLike) {
    // Unlike
    activity.likes = activity.likes.filter(like => like.user.toString() !== userId);
  } else {
    // Like
    activity.likes.push({ user: userId });
  }

  await activity.save();

  res.status(200).json({
    success: true,
    message: existingLike ? "Activity unliked" : "Activity liked",
    likes: activity.likes.length
  });
});

// Comment on an activity
export const commentOnActivity = catchAsyncError(async (req, res, next) => {
  const { activityId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  const activity = await Activity.findById(activityId);
  if (!activity) {
    return next(new ErrorHandler("Activity not found!", 404));
  }

  activity.comments.push({
    user: userId,
    content
  });

  await activity.save();

  // Populate the new comment
  await activity.populate('comments.user', 'name profilePhoto');

  res.status(200).json({
    success: true,
    message: "Comment added successfully!",
    comment: activity.comments[activity.comments.length - 1]
  });
});

// ============ COMPANY REVIEWS ============

// Write a company review
export const writeCompanyReview = catchAsyncError(async (req, res, next) => {
  const { companyId, employment, ratings, review, wouldRecommend, isAnonymous } = req.body;
  const reviewerId = req.user.id;

  // Check if company exists
  const company = await User.findById(companyId);
  if (!company || (company.role !== 'Employer' && company.role !== 'Recruiter')) {
    return next(new ErrorHandler("Company not found!", 404));
  }

  // Check if user already reviewed this company
  const existingReview = await CompanyReview.findOne({
    reviewer: reviewerId,
    company: companyId
  });

  if (existingReview) {
    return next(new ErrorHandler("You have already reviewed this company!", 400));
  }

  const companyReview = await CompanyReview.create({
    reviewer: reviewerId,
    company: companyId,
    employment,
    ratings,
    review,
    wouldRecommend,
    isAnonymous
  });

  res.status(201).json({
    success: true,
    message: "Company review submitted successfully!",
    review: companyReview
  });
});

// Get company reviews
export const getCompanyReviews = catchAsyncError(async (req, res, next) => {
  const { companyId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const reviews = await CompanyReview.find({ 
    company: companyId, 
    status: 'active' 
  })
  .populate('reviewer', 'name profilePhoto', null, { 
    match: { isAnonymous: false } 
  })
  .sort({ createdAt: -1 })
  .limit(limit * 1)
  .skip((page - 1) * limit);

  // Calculate average ratings
  const averageRatings = await CompanyReview.aggregate([
    { $match: { company: companyId, status: 'active' } },
    {
      $group: {
        _id: null,
        avgOverall: { $avg: '$ratings.overall' },
        avgWorkLifeBalance: { $avg: '$ratings.workLifeBalance' },
        avgCulture: { $avg: '$ratings.culture' },
        avgCareerOpportunities: { $avg: '$ratings.careerOpportunities' },
        avgCompensation: { $avg: '$ratings.compensation' },
        avgManagement: { $avg: '$ratings.management' },
        totalReviews: { $sum: 1 },
        recommendationRate: { $avg: { $cond: ['$wouldRecommend', 1, 0] } }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    reviews,
    averageRatings: averageRatings[0] || null,
    pagination: {
      currentPage: parseInt(page),
      hasNext: reviews.length === limit
    }
  });
});

// ============ FOLLOW SYSTEM ============

// Follow a user or company
export const followUser = catchAsyncError(async (req, res, next) => {
  const { userId } = req.params;
  const followerId = req.user.id;

  if (followerId === userId) {
    return next(new ErrorHandler("You cannot follow yourself!", 400));
  }

  const userToFollow = await User.findById(userId);
  if (!userToFollow) {
    return next(new ErrorHandler("User not found!", 404));
  }

  // Check if already following
  const existingFollow = await Follow.findOne({
    follower: followerId,
    following: userId
  });

  if (existingFollow) {
    return next(new ErrorHandler("You are already following this user!", 400));
  }

  const follow = await Follow.create({
    follower: followerId,
    following: userId,
    followType: userToFollow.role === 'Employer' ? 'company' : 'user'
  });

  res.status(201).json({
    success: true,
    message: `Now following ${userToFollow.name}!`,
    follow
  });
});

// Unfollow a user
export const unfollowUser = catchAsyncError(async (req, res, next) => {
  const { userId } = req.params;
  const followerId = req.user.id;

  const follow = await Follow.findOneAndDelete({
    follower: followerId,
    following: userId
  });

  if (!follow) {
    return next(new ErrorHandler("You are not following this user!", 400));
  }

  res.status(200).json({
    success: true,
    message: "Unfollowed successfully!"
  });
});

// Get followers
export const getFollowers = catchAsyncError(async (req, res, next) => {
  const { userId } = req.params;

  const followers = await Follow.find({ following: userId })
    .populate('follower', 'name headline profilePhoto')
    .sort({ followedAt: -1 });

  res.status(200).json({
    success: true,
    followers: followers.map(f => f.follower),
    totalFollowers: followers.length
  });
});

// Get following
export const getFollowing = catchAsyncError(async (req, res, next) => {
  const { userId } = req.params;

  const following = await Follow.find({ follower: userId })
    .populate('following', 'name headline profilePhoto company')
    .sort({ followedAt: -1 });

  res.status(200).json({
    success: true,
    following: following.map(f => f.following),
    totalFollowing: following.length
  });
});